/**
 * Dropdown Menu Utilities: Click-triggered dropdown menus with keyboard
 * navigation, nested submenus, positioning engine, scrollable content,
 * and ARIA menu pattern support.
 */

// --- Types ---

export type DropdownPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end" | "right-start" | "left-start" | "auto";
export type TriggerMode = "click" | "hover" | "focus";

export interface DropdownItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon HTML prefix */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Type variant */
  type?: "item" | "separator" | "danger" | "header" | "checkbox";
  /** Checked state (for checkbox type) */
  checked?: boolean;
  /** Keyboard shortcut text */
  shortcut?: string;
  /** Description/subtitle */
  description?: string;
  /** Nested sub-items */
  children?: DropdownItem[];
  /** Click handler */
  onClick?: (item: DropdownItem) => void;
}

export interface DropdownOptions {
  /** Menu items */
  items: DropdownItem[];
  /** Trigger element (button, etc.) */
  trigger: HTMLElement;
  /** Placement relative to trigger */
  placement?: DropdownPlacement;
  /** How the menu opens */
  triggerMode?: TriggerMode;
  /** Offset in px from trigger */
  offset?: number;
  /** Same-width as trigger? */
  sameWidth?: boolean;
  /** Min width in px */
  minWidth?: number;
  /** Max width in px */
  maxWidth?: number;
  /** Max height before scrolling */
  maxHeight?: number;
  /** Z-index */
  zIndex?: number;
  /** Open/close animation duration (ms) */
  animationDuration?: number;
  /** Close on item click */
  closeOnClick?: boolean;
  /** Container for portal rendering */
  container?: HTMLElement;
  /** Called when menu opens */
  onOpen?: () => void;
  /** Called when menu closes */
  onClose?: () => void;
  /** Called when an item is selected */
  onSelect?: (item: DropdownItem) => void;
  /** Custom class name */
  className?: string;
}

export interface DropdownInstance {
  /** The root dropdown element */
  el: HTMLElement;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Toggle open/close */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update items dynamically */
  setItems: (items: DropdownItem[]) => void;
  /** Update placement */
  setPlacement: (placement: DropdownPlacement) => void;
  /** Destroy */
  destroy: () => void;
}

// --- CSS ---

const DROPDOWN_STYLES = `
.dropdown-menu {
  position:absolute;background:#fff;border:1px solid #e5e7eb;border-radius:8px;
  box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:4px 0;min-width:160px;
  z-index:1050;opacity:0;transform:scale(0.96);transform-origin:top left;
  transition:opacity 0.12s ease,transform 0.12s ease;pointer-events:none;
  outline:none;max-height:320px;overflow-y:auto;
}
.dropdown-menu.open { opacity:1;transform:scale(1);pointer-events:auto; }
.dd-item {
  display:flex;align-items:center;gap:8px;padding:8px 14px;cursor:pointer;font-size:13px;
  color:#374151;white-space:nowrap;border:none;background:none;width:100%;
  text-align:left;transition:background 0.08s;line-height:1.4;
}
.dd-item:hover,.dd-item.focused { background:#f9fafb;color:#111827; }
.dd-item.disabled { opacity:0.4;cursor:not-allowed;pointer-events:none; }
.dd-item.danger { color:#dc2626; }
.dd-item.danger:hover { background:#fef2f2; }
.dd-sep { height:1px;background:#f3f4f6;margin:4px 10px; }
.dd-header { padding:8px 14px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em; }
.dd-icon { flex-shrink:0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:13px; }
.dd-label { flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis; }
.dd-desc { font-size:11px;color:#9ca3af;margin-left:24px; }
.dd-shortcut { color:#9ca3af;font-size:11px;margin-left:auto;flex-shrink:0; }
.dd-check { width:14px;height:14px;border:1.5px solid #d1d5db;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;flex-shrink:0;margin-right:2px;background:transparent;transition:all 0.12s; }
.dd-check.checked { background:#3b82f6;border-color:#3b82f6; }
.dd-sub-arrow { color:#9ca3af;font-size:10px;margin-left:auto;flex-shrink:0; }
.dd-submenu { position:absolute;left:100%;top:-4px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,0.1);padding:4px 0;min-width:150px;display:none;z-index:1051; }
.dd-submenu.open { display:block; }
`;

let ddStylesInjected = false;

function _injectDdStyles(): void {
  if (ddStylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = DROPDOWN_STYLES;
  style.id = "dropdown-styles";
  document.head.appendChild(style);
  ddStylesInjected = true;
}

// --- Core Factory ---

/**
 * Create a dropdown menu attached to a trigger element.
 *
 * @example
 * ```ts
 * const dd = createDropdown({
 *   trigger: document.getElementById("menu-btn")!,
 *   items: [
 *     { id: "profile", label: "Profile", icon: "&#128100;" },
 *     { id: "sep", type: "separator" },
 *     { id: "logout", label: "Sign out", type: "danger", onClick: () => logout() },
 *   ],
 * });
 * ```
 */
export function createDropdown(options: DropdownOptions): DropdownInstance {
  _injectDdStyles();

  const {
    items,
    trigger,
    placement = "bottom-start",
    triggerMode = "click",
    offset = 4,
    sameWidth = false,
    minWidth = 160,
    maxWidth = 280,
    maxHeight = 320,
    zIndex = 1050,
    animationDuration = 120,
    closeOnClick = true,
    container,
    onOpen,
    onClose,
    onSelect,
    className,
  } = options;

  let _open = false;
  let _items = [...items];
  let _focusedIndex = -1;
  let cleanupFns: Array<() => void> = [];
  let itemEls: HTMLElement[] = [];
  let focusableIdxs: number[] = [];

  // Root dropdown panel
  const root = document.createElement("div");
  root.className = `dropdown-menu ${className ?? ""}`.trim();
  root.setAttribute("role", "menu");
  root.style.minWidth = `${minWidth}px`;
  root.style.maxWidth = `${maxWidth}px`;
  root.style.maxHeight = `${maxHeight}px`;
  root.style.zIndex = String(zIndex);

  // Initially hidden
  root.style.display = "none";
  (container ?? document.body).appendChild(root);

  // --- Render ---

  function render(): void {
    root.innerHTML = "";
    itemEls = [];
    focusableIdxs = [];

    for (const item of _items) {
      if (item.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "dd-sep";
        sep.setAttribute("role", "separator");
        root.appendChild(sep);
        continue;
      }

      if (item.type === "header") {
        const hdr = document.createElement("div");
        hdr.className = "dd-header";
        hdr.textContent = item.label;
        root.appendChild(hdr);
        continue;
      }

      const li = document.createElement("div");
      li.className = "dd-item";
      if (item.type === "danger") li.classList.add("danger");
      if (item.disabled) li.classList.add("disabled");
      li.setAttribute("role", "menuitem");
      li.dataset.itemId = item.id;

      // Checkbox
      if (item.type === "checkbox") {
        const cb = document.createElement("span");
        cb.className = `dd-check${item.checked ? " checked" : ""}`;
        cb.innerHTML = item.checked ? "&#10003;" : "";
        cb.addEventListener("click", (e) => {
          e.stopPropagation();
          item.checked = !item.checked;
          cb.className = `dd-check${item.checked ? " checked" : ""}`;
          cb.innerHTML = item.checked ? "&#10003;" : "";
          item.onClick?.(item);
        });
        li.appendChild(cb);
      } else if (item.icon) {
        const ic = document.createElement("span");
        ic.className = "dd-icon";
        ic.innerHTML = item.icon;
        li.appendChild(ic);
      }

      // Label
      const lbl = document.createElement("span");
      lbl.className = "dd-label";
      lbl.textContent = item.label;
      li.appendChild(lbl);

      // Description
      if (item.description) {
        const desc = document.createElement("span");
        desc.className = "dd-desc";
        desc.textContent = item.description;
        li.appendChild(desc);
      }

      // Shortcut
      if (item.shortcut) {
        const sc = document.createElement("span");
        sc.className = "dd-shortcut";
        sc.textContent = item.shortcut;
        li.appendChild(sc);
      }

      // Submenu arrow + submenu
      if (item.children && item.children.length > 0) {
        const arrow = document.createElement("span");
        arrow.className = "dd-sub-arrow";
        arrow.innerHTML = "&#9654;";
        li.appendChild(arrow);

        const sub = document.createElement("div");
        sub.className = "dd-submenu";

        for (const child of item.children) {
          if (child.type === "separator") {
            const s = document.createElement("div");
            s.className = "dd-sep";
            sub.appendChild(s);
            continue;
          }
          const ci = document.createElement("div");
          ci.className = `dd-item${child.type === "danger" ? " danger" : ""}${child.disabled ? " disabled" : ""}`;
          ci.setAttribute("role", "menuitem");
          ci.textContent = child.label;
          ci.addEventListener("click", () => {
            if (!child.disabled) {
              child.onClick?.(child);
              onSelect?.(child);
              if (closeOnClick) close();
            }
          });
          sub.appendChild(ci);
        }

        li.appendChild(sub);

        li.addEventListener("mouseenter", () => sub.classList.add("open"));
        li.addEventListener("mouseleave", () => sub.classList.remove("open"));
      }

      // Click handler
      li.addEventListener("click", () => {
        if (item.disabled) return;
        if (item.type === "checkbox") return; // handled above

        item.onClick?.(item);
        onSelect?.(item);
        if (closeOnClick) close();
      });

      // Hover focus
      li.addEventListener("mouseenter", () => {
        const idx = itemEls.indexOf(li);
        if (idx >= 0) focusItem(idx);
      });

      root.appendChild(li);
      itemEls.push(li);
      if (!item.disabled && item.type !== "header" && item.type !== "separator") {
        focusableIdxs.push(itemEls.length - 1);
      }
    }
  }

  // --- Positioning ---

  function position(): void {
    const rect = trigger.getBoundingClientRect();

    let left: number;
    let top: number;

    switch (placement) {
      case "bottom-start":
        left = rect.left;
        top = rect.bottom + offset;
        break;
      case "bottom-end":
        left = rect.right - root.offsetWidth;
        top = rect.bottom + offset;
        break;
      case "top-start":
        left = rect.left;
        top = rect.top - root.offsetHeight - offset;
        break;
      case "top-end":
        left = rect.right - root.offsetWidth;
        top = rect.top - root.offsetHeight - offset;
        break;
      case "right-start":
        left = rect.right + offset;
        top = rect.top;
        break;
      case "left-start":
        left = rect.left - root.offsetWidth - offset;
        top = rect.top;
        break;
      default:
        left = rect.left;
        top = rect.bottom + offset;
    }

    root.style.left = `${Math.max(4, left)}px`;
    root.style.top = `${Math.max(4, top)}px`;

    if (sameWidth) root.style.width = `${rect.width}px`;

    // Boundary check
    requestAnimationFrame(() => {
      const r = root.getBoundingClientRect();
      if (r.right > window.innerWidth - 4) {
        root.style.left = `${window.innerWidth - r.width - 4}px`;
      }
      if (r.bottom > window.innerHeight - 4) {
        root.style.top = `${rect.top - r.height - offset}px`;
      }
      if (r.left < 4) root.style.left = "4px";
      if (r.top < 4) root.style.top = "4px";
    });
  }

  // --- Focus management ---

  function focusItem(idx: number): void {
    itemEls.forEach((el) => el.classList.remove("focused"));
    _focusedIndex = idx;
    if (idx >= 0 && idx < itemEls.length) {
      itemEls[idx]!.classList.add("focused");
      itemEls[idx]!.scrollIntoView({ block: "nearest" });
    }
  }

  function moveFocus(dir: number): void {
    const curPos = focusableIdxs.indexOf(_focusedIndex);
    let nextPos: number;
    if (curPos < 0) nextPos = dir > 0 ? 0 : focusableIdxs.length - 1;
    else {
      nextPos = curPos + dir;
      if (nextPos < 0) nextPos = focusableIdxs.length - 1;
      if (nextPos >= focusableIdxs.length) nextPos = 0;
    }
    focusItem(focusableIdxs[nextPos] ?? -1);
  }

  // --- Open/Close ---

  function open(): void {
    if (_open) return;
    render();
    position();
    root.style.display = "";
    _open = true;
    _focusedIndex = -1;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.add("open"));
    });

    setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    root.classList.remove("open");

    setTimeout(() => {
      root.style.display = "none";
      _open = false;
      _focusedIndex = -1;
      removeListeners();
      onClose?.();
    }, animationDuration);
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function setItems(newItems: DropdownItem[]): void {
    _items = newItems;
    if (_open) render();
  }

  function setPlacement(p: DropdownPlacement): void {
    // Would need to re-store and re-position on next open
    Object.assign(options, { placement: p });
    if (_open) position();
  }

  // --- Listeners ---

  function setupListeners(): void {
    removeListeners();

    // Click outside
    const outsideClick = (e: MouseEvent) => {
      if (!root.contains(e.target as Node) && !trigger.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", outsideClick);
    cleanupFns.push(() => document.removeEventListener("mousedown", outsideClick));

    // Keyboard
    const keyHandler = (e: KeyboardEvent) => {
      if (!_open) return;
      switch (e.key) {
        case "Escape": e.preventDefault(); close(); break;
        case "ArrowDown": e.preventDefault(); moveFocus(1); break;
        case "ArrowUp": e.preventDefault(); moveFocus(-1); break;
        case "Enter":
        case " ": e.preventDefault();
          if (_focusedIndex >= 0) itemEls[_focusedIndex]?.click();
          break;
        case "Home": e.preventDefault(); focusItem(focusableIdxs[0] ?? -1); break;
        case "End": e.preventDefault(); focusItem(focusableIdxs[focusableIdxs.length - 1] ?? -1); break;
      }
    };
    document.addEventListener("keydown", keyHandler);
    cleanupFns.push(() => document.removeEventListener("keydown", keyHandler));
  }

  function removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  function destroy(): void {
    close();
    root.remove();
  }

  // Attach trigger handler
  if (triggerMode === "click") {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
  } else if (triggerMode === "hover") {
    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", () => setTimeout(close, 150));
  } else if (triggerMode === "focus") {
    trigger.addEventListener("focus", open);
    trigger.addEventListener("blur", (e) => {
      if (!root.contains(e.relatedTarget as Node)) close();
    });
  }

  return { el: root, open, close, toggle, isOpen, setItems, setPlacement, destroy };
}
