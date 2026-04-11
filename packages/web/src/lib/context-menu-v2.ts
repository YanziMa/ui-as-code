/**
 * Context Menu V2: Enhanced right-click context menu with nested submenus,
 * icons, keyboard navigation, dynamic items, positioning variants, animations,
 * separator support, and accessibility.
 */

// --- Types ---

export type ContextMenuItemType = "normal" | "checkbox" | "radio" | "danger" | "disabled" | "separator" | "submenu" | "info";

export interface ContextMenuItem {
  /** Unique ID */
  id?: string;
  /** Display label */
  label: string;
  /** Item type */
  type?: ContextMenuItemType;
  /** Icon (emoji, SVG string, or HTML element) */
  icon?: string | HTMLElement;
  /** Shortcut hint text */
  shortcut?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Checked state (for checkbox/radio) */
  checked?: boolean;
  /** Submenu items */
  submenu?: ContextMenuItem[];
  /** Callback on click */
  action?: () => void;
  /** Danger/destructive styling */
  danger?: boolean;
  /** Custom data payload */
  data?: unknown;
}

export interface ContextMenuV2Options {
  /** Items to display */
  items: ContextMenuItem[];
  /** Trigger element or selector (right-click target) */
  trigger?: HTMLElement | string;
  /** Position mode */
  position?: "auto" | "cursor" | "center";
  /** Min width (px) */
  minWidth?: number;
  /** Max height before scroll (px) */
  maxHeight?: number;
  /** Show icons column */
  showIcons?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Callback before showing (return false to cancel) */
  shouldShow?: (e: MouseEvent) => boolean;
  /** Custom CSS class */
  className?: string;
  /** Z-index */
  zIndex?: number;
}

export interface ContextMenuV2Instance {
  element: HTMLDivElement;
  /** Show the menu at position */
  show: (x: number, y: number) => void;
  /** Hide the menu */
  hide: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update items dynamically */
  setItems: (items: ContextMenuItem[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Main Factory ---

export function createContextMenuV2(options: ContextMenuV2Options): ContextMenuV2Instance {
  const opts = {
    position: options.position ?? "auto",
    minWidth: options.minWidth ?? 200,
    maxHeight: options.maxHeight ?? 400,
    showIcons: options.showIcons ?? true,
    animationDuration: options.animationDuration ?? 150,
    zIndex: options.zIndex ?? 11000,
    className: options.className ?? "",
    ...options,
  };

  let triggerEl: HTMLElement | null = null;
  if (options.trigger) {
    triggerEl = typeof options.trigger === "string"
      ? document.querySelector<HTMLElement>(options.trigger)
      : options.trigger;
  }

  let visible = false;
  let destroyed = false;
  let activeSubmenu: string | null = null;

  // Create root menu element
  const root = document.createElement("div");
  root.className = `ctx-menu-v2 ${opts.className}`;
  root.setAttribute("role", "menu");
  root.style.cssText = `
    position:fixed;z-index:${opts.zIndex};min-width:${opts.minWidth}px;max-width:320px;
    background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.1);
    padding:5px;font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    opacity:0;pointer-events:none;transition:opacity ${opts.animationDuration}ms ease,transform ${opts.animationDuration}ms ease;
    transform:scale(0.95);display:none;
  `;
  document.body.appendChild(root);

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    const menuList = document.createElement("div");
    menuList.className = "ctx-menu-list";
    menuList.style.cssText = `
      display:flex;flex-direction:column;max-height:${opts.maxHeight}px;overflow-y:auto;
      padding:3px 0;min-width:${opts.minWidth - 10}px;
    `;
    root.appendChild(menuList);

    for (const item of opts.items) {
      if (item.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "ctx-sep";
        sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 12px;";
        menuList.appendChild(sep);
        continue;
      }

      const itemEl = createMenuItem(item);
      menuList.appendChild(itemEl);
    }
  }

  function createMenuItem(item: ContextMenuItem): HTMLElement {
    const isDisabled = item.disabled || item.type === "disabled" || item.type === "info";
    const isDanger = item.danger || item.type === "danger";

    const el = document.createElement("div");
    el.className = `ctx-item ctx-item-${item.type ?? "normal"}${isDanger ? " ctx-danger" : ""}${isDisabled ? " ctx-disabled" : ""}`;
    el.dataset.itemId = item.id ?? item.label;
    el.setAttribute("role", isDisabled ? "none" : "menuitem");
    el.setAttribute("tabindex", isDisabled ? "-1" : "0");
    el.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:7px 14px;border-radius:6px;
      cursor:${isDisabled ? "default" : "pointer"};
      transition:background 0.1s;user-select:none;position:relative;
      ${isDisabled ? "opacity:0.45;" : ""}
    `;

    // Icon
    if ((item.icon || opts.showIcons) && item.type !== "separator") {
      const iconArea = document.createElement("span");
      iconArea.className = "ctx-icon-area";
      iconArea.style.cssText = `width:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;`;

      if (typeof item.icon === "string") {
        iconArea.innerHTML = item.icon;
      } else if (item.icon instanceof HTMLElement) {
        iconArea.appendChild(item.icon);
      } else if (item.type === "checkbox" || item.type === "radio") {
        const box = document.createElement("span");
        const isChecked = item.checked ?? false;
        box.style.cssText = `
          width:14px;height:14px;border-radius:${item.type === "radio" ? "50%" : "3px"};
          border:2px solid ${isChecked ? (isDanger ? "#ef4444" : "#4338ca") : "#d1d5db"};
          display:flex;align-items:center;justify-content:center;
          background:${isChecked ? (isDanger ? "#ef4444" : "#4338ca") : "transparent"};
          transition:all 0.15s;flex-shrink:0;
        `;
        if (isChecked) {
          box.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;
        }
        iconArea.appendChild(box);
      }

      el.appendChild(iconArea);
    }

    // Label + shortcut area
    const content = document.createElement("div");
    content.className = "ctx-content";
    content.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;";

    const labelEl = document.createElement("span");
    labelEl.className = "ctx-label";
    labelEl.textContent = item.label;
    labelEl.style.cssText = `
      font-size:13px;font-weight:500;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      color:${isDanger ? "#dc2626" : isDisabled ? "#9ca3af" : ""};
    `;
    content.appendChild(labelEl);

    // Shortcut hint
    if (item.shortcut) {
      const shortcutEl = document.createElement("span");
      shortcutEl.className = "ctx-shortcut";
      shortcutEl.textContent = item.shortcut;
      shortcutEl.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;padding-left:16px;";
      content.appendChild(shortcutEl);
    }

    el.appendChild(content);

    // Submenu arrow
    if (item.submenu && item.submenu.length > 0) {
      const arrow = document.createElement("span");
      arrow.innerHTML = "\u25B6";
      arrow.style.cssText = "font-size:9px;color:#9ca3af;margin-left:auto;";
      el.appendChild(arrow);

      // Nested submenu container
      const subContainer = document.createElement("div");
      subContainer.className = "ctx-submenu";
      subContainer.dataset.parentId = item.id ?? item.label;
      subContainer.style.cssText = `
        display:none;position:absolute;left:100%;top:-5px;
        min-width:160px;background:#fff;border-radius:8px;
        box-shadow:0 4px 16px rgba(0,0,0,0.12);padding:5px 0;z-index:10;
      `;

      for (const subItem of item.submenu) {
        if (subItem.type === "separator") {
          const sep = document.createElement("div");
          sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 12px;";
          subContainer.appendChild(sep);
        } else {
          subContainer.appendChild(createMenuItem(subItem));
        }
      }

      el.appendChild(subContainer);

      // Hover to show/hide submenu
      el.addEventListener("mouseenter", () => {
        activeSubmenu = item.id ?? item.label;
        subContainer.style.display = "block";
        el.classList.add("ctx-active");
      });
      el.addEventListener("mouseleave", () => {
        setTimeout(() => {
          if (activeSubmenu !== (item.id ?? item.label)) {
            subContainer.style.display = "none";
            el.classList.remove("ctx-active");
          }
        }, 100);
      });
    }

    // Event handlers
    if (!isDisabled) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (item.submenu) return; // Don't close on submenu parent click

        if (item.type === "checkbox" || item.type === "radio") {
          // Toggle checked state visually (actual handling in action)
          item.checked = !item.checked;
        }

        hide();
        item.action?.();
      });

      el.addEventListener("mouseenter", () => {
        el.style.background = "#f3f4f6";
        if (!item.submenu) activeSubmenu = null;
      });
      el.addEventListener("mouseleave", () => {
        el.style.background = "";
      });
    }

    return el;
  }

  // --- Positioning ---

  function positionAt(x: number, y: number): void {
    const rect = root.getBoundingClientRect();

    // Clamp to viewport
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;

    root.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
    root.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
  }

  function positionNearCursor(e: MouseEvent): void {
    positionAt(e.clientX + 2, e.clientY + 2);
  }

  // --- Show/Hide ---

  function show(x: number, y: number): void {
    if (destroyed || visible) return;
    render();
    positionAt(x, y);
    root.style.display = "";
    requestAnimationFrame(() => {
      root.style.opacity = "1";
      root.style.transform = "scale(1)";
      root.style.pointerEvents = "auto";
    });
    visible = true;
    opts.onOpen?.();
  }

  function hide(): void {
    if (!visible || destroyed) return;
    root.style.opacity = "0";
    root.style.transform = "scale(0.95)";
    root.style.pointerEvents = "none";
    activeSubmenu = null;
    setTimeout(() => { root.style.display = "none"; }, opts.animationDuration);
    visible = false;
    opts.onClose?.();
  }

  // --- Event Binding ---

  if (triggerEl) {
    triggerEl.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (opts.shouldShow?.(e) === false) return;
      positionNearCursor(e);
      show(e.clientX + 2, e.clientY + 2);
    });
  }

  // Click outside to close
  document.addEventListener("mousedown", (e) => {
    if (visible && !root.contains(e.target as Node)) hide();
  });

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && visible) { e.preventDefault(); hide(); }
  };
  document.addEventListener("keydown", escHandler);

  // Keyboard navigation within menu
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]:not(.ctx-disabled)'));
      const currentIdx = focusable.indexOf(document.activeElement as HTMLElement);
      let nextIdx: number;
      if (e.key === "ArrowDown") nextIdx = (currentIdx + 1) % focusable.length;
      else nextIdx = (currentIdx - 1 + focusable.length) % focusable.length;
      focusable[nextIdx]?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.click();
    }
  });

  // Instance
  const instance: ContextMenuV2Instance = {
    element: root,
    show,
    hide,
    isVisible: () => visible,
    setItems(items: ContextMenuItem[]) {
      opts.items = items;
      if (visible) render();
    },
    destroy() {
      destroyed = true;
      hide();
      root.remove();
      document.removeEventListener("mousedown", (e) => {
        if (visible && !root.contains(e.target as Node)) hide();
      });
      document.removeEventListener("keydown", escHandler);
      if (triggerEl) triggerEl.removeEventListener("contextmenu", () => {});
    },
  };

  return instance;
}
