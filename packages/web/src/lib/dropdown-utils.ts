/**
 * Dropdown Utilities: Accessible dropdown menu with keyboard navigation,
 * item groups, separators, checkboxes, submenus, and ARIA attributes.
 */

// --- Types ---

export interface DropdownItem {
  /** Unique key */
  id: string;
  /** Display label */
  label: string;
  /** Optional description/subtitle */
  description?: string;
  /** Icon (HTML string or element) */
  icon?: string | HTMLElement;
  /** Disabled state */
  disabled?: boolean;
  /** Item type */
  type?: "item" | "separator" | "header" | "checkbox" | "danger";
  /** Checked state for checkbox items */
  checked?: boolean;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Custom data */
  data?: unknown;
  /** Click handler */
  onClick?: (item: DropdownItem, event: MouseEvent) => void;
  /** Submenu items */
  children?: DropdownItem[];
}

export interface DropdownOptions {
  /** Trigger button/element */
  trigger: HTMLElement;
  /** Menu items */
  items: DropdownItem[];
  /** Placement relative to trigger */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end" | "right" | "left";
  /** Width of dropdown menu */
  width?: number | string;
  /** Max height with scroll */
  maxHeight?: number;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Close on item click */
  closeOnSelect?: boolean;
  /** Close on click outside */
  closeOnClickOutside?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Called when dropdown opens */
  onOpen?: () => void;
  /** Called when dropdown closes */
  onClose?: () => void;
  /** Called when an item is selected */
  onSelect?: (item: DropdownItem) => void;
}

export interface DropdownInstance {
  /** The dropdown container element */
  el: HTMLElement;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update items */
  setItems: (items: DropdownItem[]) => void;
  /** Get currently focused item index */
  getFocusedIndex: () => number;
  /** Focus a specific item by index */
  focusItem: (index: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- CSS Base Styles ---

const DROPDOWN_STYLES = `
.dropdown-menu {
  position:absolute;background:#fff;border:1px solid #e5e7eb;
  border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);
  padding:4px 0;min-width:180px;max-height:300px;overflow-y:auto;
  z-index:1050;opacity:0;transform:scale(0.95);transform-origin:top left;
  transition:opacity 0.15s ease, transform 0.15s ease;pointer-events:none;
}
.dropdown-menu.open { opacity:1;transform:scale(1);pointer-events:auto; }
.dropdown-item { display:flex;align-items:center;gap:8px;padding:8px 12px;
  cursor:pointer;font-size:14px;color:#111827;white-space:nowrap;
  border:none;background:none;width:100%;text-align:left;transition:background 0.1s; }
.dropdown-item:hover,.dropdown-item.focused { background:#f3f4f6; }
.dropdown-item.disabled { opacity:0.5;cursor:not-allowed;pointer-events:none; }
.dropdown-item.danger { color:#dc2626; }
.dropdown-item.danger:hover { background:#fef2f2; }
.dropdown-separator { height:1px;background:#e5e7eb;margin:4px 8px; }
.dropdown-header { padding:6px 12px;font-size:12px;color:#6b7280;font-weight:600; }
.dropdown-item-shortcut { margin-left:auto;color:#9ca3af;font-size:12px; }
.dropdown-item-description { font-size:12px;color:#6b7280;margin-left:0; }
.dropdown-checkbox { width:16px;height:16px;border:2px solid #d1d5db;border-radius:3px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.dropdown-checkbox.checked { background:#3b82f6;border-color:#3b82f6; }
`;

// --- Core Factory ---

/**
 * Create an accessible dropdown menu.
 *
 * @example
 * ```ts
 * const dropdown = createDropdown({
 *   trigger: menuButton,
 *   items: [
 *     { id: "copy", label: "Copy", shortcut: "⌘C" },
 *     { id: "sep", type: "separator" },
 *     { id: "delete", label: "Delete", type: "danger", onClick: () => {} },
 *   ],
 * });
 * ```
 */
export function createDropdown(options: DropdownOptions): DropdownInstance {
  const {
    trigger,
    items,
    placement = "bottom-start",
    width,
    maxHeight = 300,
    className,
    zIndex = 1050,
    closeOnSelect = true,
    closeOnClickOutside = true,
    animationDuration = 150,
    onOpen,
    onClose,
    onSelect,
  } = options;

  let _open = false;
  let _focusedIndex = -1;
  let cleanupFns: Array<() => void> = [];
  let itemElements: HTMLElement[] = [];
  let focusableItems: number[] = [];

  // Inject styles once
  _injectStyles();

  // Create menu
  const menu = document.createElement("div");
  menu.className = `dropdown-menu ${className ?? ""}`.trim();
  menu.setAttribute("role", "menu");
  if (width) menu.style.width = typeof width === "number" ? `${width}px` : width;
  if (maxHeight) menu.style.maxHeight = `${maxHeight}px`;
  menu.style.zIndex = String(zIndex);

  document.body.appendChild(menu);

  // Render items
  _renderItems(items);

  // --- Positioning ---

  function updatePosition(): void {
    const triggerRect = trigger.getBoundingClientRect();
    let top: number;
    let left: number;

    switch (placement) {
      case "bottom-end":
        left = triggerRect.right - menu.offsetWidth;
        top = triggerRect.bottom + 4;
        break;
      case "top-start":
        left = triggerRect.left;
        top = triggerRect.top - menu.offsetHeight - 4;
        break;
      case "top-end":
        left = triggerRect.right - menu.offsetWidth;
        top = triggerRect.top - menu.offsetHeight - 4;
        break;
      case "right":
        left = triggerRect.right + 4;
        top = triggerRect.top;
        break;
      case "left":
        left = triggerRect.left - menu.offsetWidth - 4;
        top = triggerRect.top;
        break;
      case "bottom-start":
      default:
        left = triggerRect.left;
        top = triggerRect.bottom + 4;
        break;
    }

    // Boundary check — flip vertically if needed
    if (top + menu.offsetHeight > window.innerHeight && placement.startsWith("bottom")) {
      top = triggerRect.top - menu.offsetHeight - 4;
    }
    if (top < 0 && placement.startsWith("top")) {
      top = triggerRect.bottom + 4;
    }
    // Horizontal boundary
    if (left + menu.offsetWidth > window.innerWidth) {
      left = window.innerWidth - menu.offsetWidth - 8;
    }
    if (left < 0) left = 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  // --- Render ---

  function _renderItems(itemsList: DropdownItem[]): void {
    menu.innerHTML = "";
    itemElements = [];
    focusableItems = [];

    itemsList.forEach((item, idx) => {
      if (item.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "dropdown-separator";
        sep.setAttribute("role", "separator");
        menu.appendChild(sep);
        itemElements.push(sep);
        return;
      }

      if (item.type === "header") {
        const header = document.createElement("div");
        header.className = "dropdown-header";
        header.textContent = item.label;
        header.setAttribute("role", "presentation");
        menu.appendChild(header);
        itemElements.push(header);
        return;
      }

      const li = document.createElement("div");
      li.className = "dropdown-item";
      if (item.type === "danger") li.classList.add("danger");
      if (item.disabled) li.classList.add("disabled");

      li.setAttribute("role", "menuitem");
      li.setAttribute("tabIndex", "-1");
      li.dataset.itemId = item.id;

      // Checkbox
      if (item.type === "checkbox") {
        const checkbox = document.createElement("span");
        checkbox.className = `dropdown-checkbox ${item.checked ? "checked" : ""}`;
        checkbox.innerHTML = item.checked ? "&#10003;" : "";
        li.appendChild(checkbox);
      } else if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = typeof item.icon === "string" ? item.icon : "";
        li.appendChild(iconSpan);
      }

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      li.appendChild(labelSpan);

      // Description
      if (item.description) {
        const descSpan = document.createElement("span");
        descSpan.className = "dropdown-item-description";
        descSpan.textContent = item.description;
        li.appendChild(descSpan);
      }

      // Shortcut
      if (item.shortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "dropdown-item-shortcut";
        shortcutSpan.textContent = item.shortcut;
        li.appendChild(shortcutSpan);
      }

      // Click handler
      li.addEventListener("click", (e) => {
        if (item.disabled || item.type === "header" || item.type === "separator") return;
        if (item.type === "checkbox") {
          item.checked = !item.checked;
          const cb = li.querySelector(".dropdown-checkbox");
          if (cb) {
            cb.className = `dropdown-checkbox ${item.checked ? "checked" : ""}`;
            cb.innerHTML = item.checked ? "&#10003;" : "";
          }
        }
        item.onClick?.(item, e);
        onSelect?.(item);
        if (closeOnSelect) close();
      });

      menu.appendChild(li);
      itemElements.push(li);
      focusableItems.push(idx);
    });
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    _open = true;
    _focusedIndex = -1;

    updatePosition();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        menu.classList.add("open");
      });
    });

    _setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    _focusedIndex = -1;

    // Remove focused class from all items
    itemElements.forEach((el) => el.classList.remove("focused"));

    menu.classList.remove("open");

    setTimeout(() => {
      if (!_open) menu.style.display = "";
    }, animationDuration);

    _removeListeners();
    onClose?.();
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function setItems(newItems: DropdownItem[]): void {
    _renderItems(newItems);
    if (_open) updatePosition();
  }

  function getFocusedIndex(): number { return _focusedIndex; }

  function focusItem(index: number): void {
    // Remove old focus
    itemElements.forEach((el) => el.classList.remove("focused"));
    _focusedIndex = index;

    if (index >= 0 && index < itemElements.length) {
      itemElements[index]!.classList.add("focused");
      itemElements[index]!.scrollIntoView({ block: "nearest" });
    }
  }

  function destroy(): void {
    if (_open) close();
    _removeListeners();
    menu.remove();
  }

  // --- Event Listeners ---

  function _setupListeners(): void {
    // Click outside
    if (closeOnClickOutside) {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!menu.contains(target) && !trigger.contains(target)) {
          close();
        }
      };
      document.addEventListener("mousedown", handler);
      cleanupFns.push(() => document.removeEventListener("mousedown", handler));
    }

    // Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (_open) {
        if (e.key === "ArrowDown") { e.preventDefault(); _moveFocus(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); _moveFocus(-1); }
        else if (e.key === "Home") { e.preventDefault(); focusItem(focusableItems[0] ?? 0); }
        else if (e.key === "End") { e.preventDefault(); focusItem(focusableItems[focusableItems.length - 1] ?? 0); }
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (_focusedIndex >= 0 && _focusedIndex < itemElements.length) {
            (_focusedIndex as any < itemElements.length) && itemElements[_focusedIndex]?.click();
          }
        }
      }
    };
    document.addEventListener("keydown", escHandler);
    cleanupFns.push(() => document.removeEventListener("keydown", escHandler));

    // Trigger click
    trigger.addEventListener("click", toggle);
    cleanupFns.push(() => trigger.removeEventListener("click", toggle));

    // Hover to focus
    menu.addEventListener("mouseover", (e) => {
      const target = (e.target as HTMLElement).closest(".dropdown-item");
      if (target) {
        const idx = itemElements.indexOf(target as HTMLElement);
        if (idx >= 0) focusItem(idx);
      }
    });
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  function _moveFocus(direction: number): void {
    const currentIdx = focusableItems.indexOf(_focusedIndex);
    let nextIdx: number;

    if (currentIdx < 0) {
      nextIdx = direction > 0 ? 0 : focusableItems.length - 1;
    } else {
      nextIdx = currentIdx + direction;
      if (nextIdx < 0) nextIdx = focusableItems.length - 1;
      if (nextIdx >= focusableItems.length) nextIdx = 0;
    }

    focusItem(focusableItems[nextIdx] ?? 0);
  }

  return { el: menu, open, close, toggle, isOpen, setItems, getFocusedIndex, focusItem, destroy };
}

// --- Style Injection ---

let stylesInjected = false;

function _injectStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = DROPDOWN_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}
