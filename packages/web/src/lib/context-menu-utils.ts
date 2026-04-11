/**
 * Context Menu Utilities: Right-click context menu with keyboard navigation,
 * nested submenus, dynamic items, custom rendering, and ARIA menu pattern.
 */

// --- Types ---

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string | HTMLElement;
  disabled?: boolean;
  type?: "item" | "separator" | "submenu" | "danger" | "checkbox";
  checked?: boolean;
  shortcut?: string;
  children?: ContextMenuItem[];
  onClick?: (item: ContextMenuItem, context: ContextMenuContext) => void;
}

export interface ContextMenuContext {
  /** The element that was right-clicked */
  target: HTMLElement;
  /** X coordinate of the click */
  x: number;
  /** Y coordinate of the click */
  y: number;
}

export interface ContextMenuOptions {
  /** Menu items */
  items: ContextMenuItem[];
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Minimum width (px) */
  minWidth?: number;
  /** Maximum width (px) */
  maxWidth?: number;
  /** Maximum height before scrolling */
  maxHeight?: number;
  /** Called when menu opens */
  onOpen?: (context: ContextMenuContext) => void;
  /** Called when menu closes */
  onClose?: () => void;
  /** Filter function to show/hide items dynamically */
  filter?: (item: ContextMenuItem, context: ContextMenuContext) => boolean;
  /** Custom item renderer */
  renderItem?: (item: ContextMenuItem, menuItemEl: HTMLElement) => void;
}

export interface ContextMenuInstance {
  /** The root menu element */
  el: HTMLElement;
  /** Show at position */
  show: (x: number, y: number, target?: HTMLElement) => void;
  /** Hide the menu */
  hide: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update items */
  setItems: (items: ContextMenuItem[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- CSS ---

const CONTEXT_MENU_STYLES = `
.context-menu {
  position:fixed;background:#fff;border:1px solid #e5e7eb;
  border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.16);
  padding:4px 0;min-width:180px;max-height:400px;overflow-y:auto;
  z-index:1100;opacity:0;transform:scale(0.95);transform-origin:top left;
  transition:opacity 0.12s ease, transform 0.12s ease;pointer-events:none;outline:none;
}
.context-menu.visible { opacity:1;transform:scale(1);pointer-events:auto; }
.ctx-item { display:flex;align-items:center;gap:8px;padding:8px 12px;
  cursor:pointer;font-size:13px;color:#111827;white-space:nowrap;border:none;
  background:none;width:100%;text-align:left;transition:background 0.08s;position:relative; }
.ctx-item:hover,.ctx-item.focused { background:#f3f4f6; }
.ctx-item.disabled { opacity:0.45;cursor:not-allowed;pointer-events:none; }
.ctx-item.danger { color:#dc2626; }
.ctx-item.danger:hover { background:#fef2f2; }
.ctx-sep { height:1px;background:#e5e7eb;margin:4px 10px; }
.ctx-icon { flex-shrink:0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:14px; }
.ctx-label { flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis; }
.ctx-shortcut { color:#9ca3af;font-size:11px;margin-left:16px;flex-shrink:0; }
.ctx-submenu-arrow { color:#9ca3af;margin-left:auto;font-size:10px; }
.ctx-checkbox { width:14px;height:14px;border:1.5px solid #d1d5db;border-radius:3px;
  display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;
  flex-shrink:0;margin-right:4px; }
.ctx-checkbox.checked { background:#3b82f6;border-color:#3b82f6; }
.submenu-container { position:absolute;left:100%;top:-4px;background:#fff;
  border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.14);
  padding:4px 0;min-width:160px;display:none;z-index:1101; }
.submenu-container.visible { display:block; }
`;

// --- Core Factory ---

/**
 * Create a right-click context menu.
 *
 * @example
 * ```ts
 * const ctxMenu = createContextMenu({
 *   items: [
 *     { id: "copy", label: "Copy", shortcut: "⌘C" },
 *     { id: "sep", type: "separator" },
 *     { id: "delete", label: "Delete", type: "danger" },
 *   ],
 * });
 *
 * // Attach to an element
 * document.addEventListener("contextmenu", (e) => {
 *   e.preventDefault();
 *   ctxMenu.show(e.clientX, e.clientY, e.target as HTMLElement);
 * });
 * ```
 */
export function createContextMenu(options: ContextMenuOptions): ContextMenuInstance {
  const {
    items,
    className,
    zIndex = 1100,
    minWidth = 170,
    maxWidth = 320,
    maxHeight = 400,
    onOpen,
    onClose,
    filter,
    renderItem,
  } = options;

  let _visible = false;
  let _context: ContextMenuContext | null = null;
  let _focusedIndex = -1;
  let cleanupFns: Array<() => void> = [];
  let itemElements: HTMLElement[] = [];
  let focusableIndices: number[] = [];

  // Inject styles
  _injectStyles();

  // Create root
  const root = document.createElement("div");
  root.className = `context-menu ${className ?? ""}`.trim();
  root.setAttribute("role", "menu");
  root.setAttribute("tabIndex", "-1");
  root.style.minWidth = `${minWidth}px`;
  root.style.maxWidth = `${maxWidth}px`;
  root.style.maxHeight = `${maxHeight}px`;
  root.style.zIndex = String(zIndex);
  document.body.appendChild(root);

  // Render initial items
  _renderItems(items);

  // --- Render ---

  function _renderItems(itemsList: ContextMenuItem[]): void {
    root.innerHTML = "";
    itemElements = [];
    focusableIndices = [];

    itemsList.forEach((item) => {
      if (item.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "ctx-sep";
        sep.setAttribute("role", "separator");
        root.appendChild(sep);
        itemElements.push(sep);
        return;
      }

      const li = document.createElement("div");
      li.className = "ctx-item";
      if (item.type === "danger") li.classList.add("danger");
      if (item.disabled) li.classList.add("disabled");

      li.setAttribute("role", "menuitem");
      li.dataset.itemId = item.id;

      // Icon or checkbox
      if (item.type === "checkbox") {
        const cb = document.createElement("span");
        cb.className = `ctx-checkbox ${item.checked ? "checked" : ""}`;
        cb.innerHTML = item.checked ? "&#10003;" : "";
        li.appendChild(cb);
      } else if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "ctx-icon";
        iconSpan.innerHTML = typeof item.icon === "string" ? item.icon : "";
        li.appendChild(iconSpan);
      }

      // Label
      const label = document.createElement("span");
      label.className = "ctx-label";
      label.textContent = item.label;
      li.appendChild(label);

      // Submenu arrow
      if (item.type === "submenu" && item.children && item.children.length > 0) {
        const arrow = document.createElement("span");
        arrow.className = "ctx-submenu-arrow";
        arrow.innerHTML = "&#9654;";
        li.appendChild(arrow);

        // Submenu container
        const submenu = document.createElement("div");
        submenu.className = "submenu-container";

        item.children.forEach((child) => {
          if (child.type === "separator") {
            const s = document.createElement("div");
            s.className = "ctx-sep";
            submenu.appendChild(s);
            return;
          }
          const subItem = _createMenuItem(child);
          submenu.appendChild(subItem);
        });

        li.appendChild(submenu);

        // Show submenu on hover
        li.addEventListener("mouseenter", () => {
          submenu.classList.add("visible");
        });
        li.addEventListener("mouseleave", () => {
          submenu.classList.remove("visible");
        });
      } else if (item.shortcut) {
        const shortcut = document.createElement("span");
        shortcut.className = "ctx-shortcut";
        shortcut.textContent = item.shortcut;
        li.appendChild(shortcut);
      }

      // Click handler
      li.addEventListener("click", () => {
        if (item.disabled) return;
        if (item.type === "checkbox") {
          item.checked = !item.checked;
          const cb = li.querySelector(".ctx-checkbox");
          if (cb) {
            cb.className = `ctx-checkbox ${item.checked ? "checked" : ""}`;
            cb.innerHTML = item.checked ? "&#10003;" : "";
          }
        }
        item.onClick?.(item, _context!);
        hide();
      });

      // Custom renderer
      renderItem?.(item, li);

      root.appendChild(li);
      itemElements.push(li);
      focusableIndices.push(itemElements.length - 1);
    });
  }

  function _createMenuItem(item: ContextMenuItem): HTMLElement {
    const el = document.createElement("div");
    el.className = `ctx-item${item.type === "danger" ? " danger" : ""}${item.disabled ? " disabled" : ""}`;
    el.setAttribute("role", "menuitem");
    el.textContent = item.label;

    el.addEventListener("click", () => {
      if (!item.disabled) {
        item.onClick?.(item, _context!);
        hide();
      }
    });

    return el;
  }

  // --- Show/Hide ---

  function show(x: number, y: number, target?: HTMLElement): void {
    // Apply filter
    let filteredItems = items;
    if (filter && target) {
      const ctx: ContextMenuContext = { target, x, y };
      filteredItems = items.filter((item) => filter(item, ctx));
    }

    _context = target ? { target, x, y } : { target: document.body, x, y };

    _renderItems(filteredItems);

    // Position
    root.style.left = `${x}px`;
    root.style.top = `${y}px`;

    // Boundary check
    requestAnimationFrame(() => {
      const rect = root.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        root.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        root.style.top = `${y - rect.height}px`;
      }
      if (rect.left < 0) {
        root.style.left = "8px";
      }
      if (rect.top < 0) {
        root.style.top = "8px";
      }
    });

    _visible = true;
    _focusedIndex = -1;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add("visible");
        root.focus();
      });
    });

    _setupListeners();
    onOpen?.(_context!);
  }

  function hide(): void {
    if (!_visible) return;
    _visible = false;
    _focusedIndex = -1;

    root.classList.remove("visible");
    itemElements.forEach((el) => el.classList.remove("focused"));

    // Close any open submenus
    root.querySelectorAll(".submenu-container.visible").forEach((sub) => {
      sub.classList.remove("visible");
    });

    setTimeout(() => {
      if (!_visible) root.style.display = "";
    }, 120);

    _removeListeners();
    onClose?.();
  }

  function isVisible(): boolean { return _visible; }

  function setItems(newItems: ContextMenuItem[]): void {
    // Can't reassign const in options, but we can update internal render
    (options as ContextMenuOptions).items = newItems;
    if (_visible) _renderItems(newItems);
  }

  function destroy(): void {
    if (_visible) hide();
    _removeListeners();
    root.remove();
  }

  // --- Event Listeners ---

  function _setupListeners(): void {
    // Click outside to close
    const outsideClick = (e: MouseEvent) => {
      if (!root.contains(e.target as Node)) hide();
    };
    document.addEventListener("mousedown", outsideClick);
    cleanupFns.push(() => document.removeEventListener("mousedown", outsideClick));

    // Keyboard navigation
    const keyHandler = (e: KeyboardEvent) => {
      if (!_visible) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          hide();
          break;
        case "ArrowDown":
          e.preventDefault();
          _moveFocus(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          _moveFocus(-1);
          break;
        case "Home":
          e.preventDefault();
          _focusItem(focusableIndices[0] ?? -1);
          break;
        case "End":
          e.preventDefault();
          _focusItem(focusableIndices[focusableIndices.length - 1] ?? -1);
          break;
        case "Enter":
        case " ": {
          e.preventDefault();
          if (_focusedIndex >= 0 && _focusedIndex < itemElements.length) {
            itemElements[_focusedIndex]?.click();
          }
          break;
        }
      }
    };
    document.addEventListener("keydown", keyHandler);
    cleanupFns.push(() => document.removeEventListener("keydown", keyHandler));

    // Hover focus
    root.addEventListener("mouseover", (e) => {
      const item = (e.target as HTMLElement).closest(".ctx-item");
      if (item) {
        const idx = itemElements.indexOf(item as HTMLElement);
        if (idx >= 0) _focusItem(idx);
      }
    });
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  function _focusItem(idx: number): void {
    itemElements.forEach((el) => el.classList.remove("focused"));
    _focusedIndex = idx;

    if (idx >= 0 && idx < itemElements.length) {
      itemElements[idx]!.classList.add("focused");
      itemElements[idx]!.scrollIntoView({ block: "nearest" });
    }
  }

  function _moveFocus(direction: number): void {
    const currentPos = focusableIndices.indexOf(_focusedIndex);
    let nextPos: number;

    if (currentPos < 0) {
      nextPos = direction > 0 ? 0 : focusableIndices.length - 1;
    } else {
      nextPos = currentPos + direction;
      if (nextPos < 0) nextPos = focusableIndices.length - 1;
      if (nextPos >= focusableIndices.length) nextPos = 0;
    }

    _focusItem(focusableIndices[nextPos] ?? -1);
  }

  return { el: root, show, hide, isVisible, setItems, destroy };
}

// --- Style Injection ---

let ctxStylesInjected = false;

function _injectStyles(): void {
  if (ctxStylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = CONTEXT_MENU_STYLES;
  document.head.appendChild(style);
  ctxStylesInjected = true;
}
