/**
 * Split Button: A button with a primary action and a secondary dropdown trigger,
 * supporting icon placement, size variants, loading states, disabled states,
 * keyboard navigation, and customizable dropdown items.
 */

// --- Types ---

export type SplitButtonSize = "sm" | "md" | "lg";
export type SplitButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";

export interface SplitButtonItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Danger/destructive style */
  danger?: boolean;
  /** Separator before this item */
  separatorBefore?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface SplitButtonOptions {
  /** Container/anchor element or selector */
  container: HTMLElement | string;
  /** Primary button label */
  label: string;
  /** Primary action callback */
  onClick?: () => void;
  /** Primary button icon (left side) */
  icon?: string;
  /** Dropdown items */
  items: SplitButtonItem[];
  /** Callback when a dropdown item is selected */
  onSelect?: (item: SplitButtonItem) => void;
  /** Size variant */
  size?: SplitButtonSize;
  /** Style variant */
  variant?: SplitButtonVariant;
  /** Disabled state (disables both parts) */
  disabled?: boolean;
  /** Loading state (shows spinner in primary part) */
  loading?: boolean;
  /** Dropdown placement */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  /** Z-index for dropdown */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class for container */
  className?: string;
  /** Width of the split divider (px) */
  dividerWidth?: number;
}

export interface SplitButtonInstance {
  /** Root DOM element */
  element: HTMLDivElement;
  /** Primary button element */
  primaryButton: HTMLButtonElement;
  /** Trigger button element */
  triggerButton: HTMLButtonElement;
  /** Update primary label */
  setLabel: (label: string) => void;
  /** Update dropdown items */
  setItems: (items: SplitButtonItem[]) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Open dropdown manually */
  openDropdown: () => void;
  /** Close dropdown */
  closeDropdown: () => void;
  /** Check if dropdown is open */
  isDropdownOpen: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

const SIZE_STYLES: Record<SplitButtonSize, { padding: string; fontSize: string; height: string; iconSize: string }> = {
  sm:   { padding: "5px 12px", fontSize: "12px", height: "28px", iconSize: "13px" },
  md:   { padding: "7px 16px", fontSize: "13px", height: "36px", iconSize: "14px" },
  lg:   { padding: "10px 20px", fontSize: "14px", height: "44px", iconSize: "16px" },
};

const VARIANT_STYLES: Record<SplitButtonVariant, { bg: string; color: string; border: string; hoverBg: string; activeBg: string }> = {
  primary:  { bg: "#4f46e5", color: "#fff", border: "#4f46e5", hoverBg: "#4338ca", activeBg: "#3730a3" },
  secondary: { bg: "#fff", color: "#374151", border: "#d1d5db", hoverBg: "#f9fafb", activeBg: "#f3f4f6" },
  danger:   { bg: "#dc2626", color: "#fff", border: "#dc2626", hoverBg: "#b91c1c", activeBg: "#991b1b" },
  ghost:    { bg: "transparent", color: "#374151", border: "transparent", hoverBg: "#f3f4f6", activeBg: "#e5e7eb" },
  outline:  { bg: "transparent", color: "#4f46e5", border: "#4f46e5", hoverBg: "#eef2ff", activeBg: "#e0e7ff" },
};

// --- Main Factory ---

export function createSplitButton(options: SplitButtonOptions): SplitButtonInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "primary",
    disabled: options.disabled ?? false,
    loading: options.loading ?? false,
    placement: options.placement ?? "bottom-end",
    zIndex: options.zIndex ?? 10600,
    animationDuration: options.animationDuration ?? 120,
    dividerWidth: options.dividerWidth ?? 1,
    ...options,
  };

  const container = resolveEl(options.container);
  if (!container) throw new Error("SplitButton: container not found");

  const sz = SIZE_STYLES[opts.size];
  const vs = VARIANT_STYLES[opts.variant];
  let destroyed = false;
  let isDropdownOpen = false;
  let currentItems = [...options.items];

  // Root container
  const root = document.createElement("div");
  root.className = `split-btn ${opts.className ?? ""}`;
  root.setAttribute("role", "group");
  root.style.cssText = `
    display:inline-flex;align-items:center;border-radius:${opts.size === "sm" ? "5px" : opts.size === "lg" ? "8px" : "6px"};
    overflow:hidden;font-family:-apple-system,sans-serif;
    box-shadow:0 1px 3px rgba(0,0,0,0.08);
    ${opts.variant === "ghost" || opts.variant === "outline" ? "" : ""}
  `;

  // Primary button
  const primaryBtn = document.createElement("button");
  primaryBtn.type = "button";
  primaryBtn.className = "split-btn-primary";
  primaryBtn.style.cssText = `
    display:inline-flex;align-items:center;gap:6px;
    padding:${sz.padding};height:${sz.height};
    font-size:${sz.fontSize};font-weight:500;
    background:${vs.bg};color:${vs.color};
    border:none;border-right:${opts.dividerWidth}px solid ${opts.variant === "ghost" ? "transparent" : opts.variant === "outline" ? vs.border : "rgba(255,255,255,0.2)"};
    cursor:pointer;white-space:nowrap;
    transition:background 0.15s ease;
    ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
  `;
  primaryBtn.textContent = opts.label;

  // Icon in primary button
  let iconEl: HTMLElement | null = null;
  if (opts.icon) {
    iconEl = document.createElement("span");
    iconEl.className = "split-btn-icon";
    iconEl.style.cssText = `display:flex;align-items:center;font-size:${sz.iconSize};flex-shrink:0;`;
    iconEl.textContent = opts.icon;
    primaryBtn.insertBefore(iconEl, primaryBtn.firstChild);
  }

  // Loading spinner
  let spinnerEl: HTMLElement | null = null;

  // Trigger button (dropdown arrow)
  const triggerBtn = document.createElement("button");
  triggerBtn.type = "button";
  triggerBtn.className = "split-btn-trigger";
  triggerBtn.setAttribute("aria-haspopup", "true");
  triggerBtn.setAttribute("aria-expanded", "false");
  triggerBtn.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    padding:0 ${opts.size === "sm" ? "8px" : opts.size === "lg" ? "12px" : "10px"};
    height:${sz.height};min-width:${opts.size === "sm" ? "24" : opts.size === "lg" ? "36" : "30"}px;
    font-size:${sz.fontSize};font-weight:500;
    background:${vs.bg};color:${vs.color};
    border:none;cursor:pointer;
    transition:background 0.15s ease;
    ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
  `;
  triggerBtn.innerHTML = "&#9660;"; // ▼

  root.appendChild(primaryBtn);
  root.appendChild(triggerBtn);
  container.appendChild(root);

  // Dropdown menu
  const menu = document.createElement("div");
  menu.className = "split-btn-dropdown";
  menu.setAttribute("role", "menu");
  menu.style.cssText = `
    position:absolute;display:none;z-index:${opts.zIndex};
    min-width:160px;background:#fff;border-radius:8px;
    box-shadow:0 10px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
    border:1px solid #e5e7eb;padding:4px;font-size:13px;
    font-family:-apple-system,sans-serif;color:#374151;
    opacity:0;transform:scale(0.96) translateY(-4px);
    transition:opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease;
  `;
  document.body.appendChild(menu);

  // Build dropdown content
  function buildMenu(): void {
    menu.innerHTML = "";

    for (const item of currentItems) {
      if (item.separatorBefore) {
        const sep = document.createElement("div");
        sep.className = "sb-separator";
        sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 8px;";
        sep.setAttribute("role", "separator");
        menu.appendChild(sep);
      }

      const itemEl = document.createElement("div");
      itemEl.className = `sb-item${item.danger ? " sb-danger" : ""}${item.className ? ` ${item.className}` : ""}`;
      itemEl.setAttribute("role", "menuitem");
      itemEl.dataset.key = item.key;
      if (item.disabled) itemEl.setAttribute("aria-disabled", "true");

      itemEl.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 12px;
        cursor:${item.disabled ? "not-allowed" : "pointer"};
        border-radius:4px;transition:background 0.1s;
        color:${item.disabled ? "#d1d5db" : item.danger ? "#dc2626" : "#374151"};
        white-space:nowrap;
      `;

      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.style.cssText = `flex-shrink:0;width:18px;text-align:center;font-size:14px;`;
        iconSpan.textContent = item.icon;
        itemEl.appendChild(iconSpan);
      }

      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      labelSpan.style.flex = "1";
      itemEl.appendChild(labelSpan);

      if (!item.disabled) {
        itemEl.addEventListener("mouseenter", () => { itemEl.style.background = "#f3f4f6"; });
        itemEl.addEventListener("mouseleave", () => { itemEl.style.background = ""; });
        itemEl.addEventListener("click", () => {
          opts.onSelect?.(item);
          closeDropdown();
        });
      }

      menu.appendChild(itemEl);
    }
  }

  function positionMenu(): void {
    const rect = root.getBoundingClientRect();
    const gap = 4;

    let x: number, y: number;
    switch (opts.placement) {
      case "bottom-end":
        x = rect.right - menu.offsetWidth;
        y = rect.bottom + gap;
        break;
      case "top-start":
        x = rect.left;
        y = rect.top - menu.offsetHeight - gap;
        break;
      case "top-end":
        x = rect.right - menu.offsetWidth;
        y = rect.top - menu.offsetHeight - gap;
        break;
      default: // bottom-start
        x = rect.left;
        y = rect.bottom + gap;
    }

    // Clamp to viewport
    const margin = 4;
    x = Math.max(margin, Math.min(x, window.innerWidth - menu.offsetWidth - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - menu.offsetHeight - margin));

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  function openDropdown(): void {
    if (isDropdownOpen || destroyed) return;
    isDropdownOpen = true;
    buildMenu();
    menu.style.display = "block";
    void menu.offsetHeight;
    menu.style.opacity = "1";
    menu.style.transform = "scale(1) translateY(0)";
    positionMenu();
    triggerBtn.setAttribute("aria-expanded", "true");
  }

  function closeDropdown(): void {
    if (!isDropdownOpen) return;
    isDropdownOpen = false;
    menu.style.opacity = "0";
    menu.style.transform = "scale(0.96) translateY(-4px)";
    setTimeout(() => {
      if (!isDropdownOpen) menu.style.display = "none";
    }, opts.animationDuration);
    triggerBtn.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown(): void {
    isDropdownOpen ? closeDropdown() : openDropdown();
  }

  // Show/hide loading spinner
  function updateLoading(show: boolean): void {
    if (show && !spinnerEl) {
      spinnerEl = document.createElement("span");
      spinnerEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" style="animation:spin 0.8s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>`;
      spinnerEl.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
      if (iconEl) {
        iconEl.replaceWith(spinnerEl);
      } else {
        primaryBtn.insertBefore(spinnerEl, primaryBtn.firstChild);
      }
    } else if (!show && spinnerEl) {
      if (iconEl) {
        spinnerEl.replaceWith(iconEl);
      } else {
        spinnerEl.remove();
      }
      spinnerEl = null;
    }
  }

  // Event handlers

  // Primary click
  primaryBtn.addEventListener("click", () => {
    if (opts.disabled || opts.loading) return;
    opts.onClick?.();
  });

  // Trigger click
  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (opts.disabled) return;
    toggleDropdown();
  });

  // Hover effects on buttons
  if (!opts.disabled) {
    primaryBtn.addEventListener("mouseenter", () => { primaryBtn.style.background = vs.hoverBg; });
    primaryBtn.addEventListener("mouseleave", () => { primaryBtn.style.background = vs.bg; });
    triggerBtn.addEventListener("mouseenter", () => { triggerBtn.style.background = vs.hoverBg; });
    triggerBtn.addEventListener("mouseleave", () => { triggerBtn.style.background = vs.bg; });
  }

  // Close on outside click
  document.addEventListener("mousedown", (e: MouseEvent) => {
    if (isDropdownOpen && !menu.contains(e.target as Node) && !root.contains(e.target as Node)) {
      closeDropdown();
    }
  });

  // Close on escape
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && isDropdownOpen) {
      e.preventDefault();
      closeDropdown();
      triggerBtn.focus();
    }
  });

  // Keyboard navigation within dropdown
  menu.addEventListener("keydown", (e: KeyboardEvent) => {
    const items = menu.querySelectorAll<HTMLDivElement>(".sb-item:not([aria-disabled='true'])");
    if (items.length === 0) return;

    const focusedIdx = Array.from(items).indexOf(document.activeElement as HTMLDivElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        const nextIdx = (focusedIdx + 1) % items.length;
        (items[nextIdx] as HTMLElement).focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        const prevIdx = (focusedIdx - 1 + items.length) % items.length;
        (items[prevIdx] as HTMLElement).focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIdx >= 0) (items[focusedIdx] as HTMLElement).click();
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        triggerBtn.focus();
        break;
    }
  });

  // Reposition on scroll/resize
  window.addEventListener("scroll", () => { if (isDropdownOpen) positionMenu(); }, true);
  window.addEventListener("resize", () => { if (isDropdownOpen) positionMenu(); });

  // Apply initial state
  if (opts.loading) updateLoading(true);

  const instance: SplitButtonInstance = {
    element: root,
    primaryButton: primaryBtn,
    triggerButton: triggerBtn,

    setLabel(label: string) {
      opts.label = label;
      // Remove icon/spinner text nodes, keep only label
      const children = Array.from(primaryBtn.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) child.remove();
      }
      const labelNode = document.createTextNode(label);
      primaryBtn.appendChild(labelNode);
    },

    setItems(items: SplitButtonItem[]) {
      currentItems = items;
      if (isDropdownOpen) buildMenu();
    },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
      primaryBtn.disabled = disabled;
      triggerBtn.disabled = disabled;
      primaryBtn.style.opacity = disabled ? "0.5" : "";
      primaryBtn.style.cursor = disabled ? "not-allowed" : "";
      triggerBtn.style.opacity = disabled ? "0.5" : "";
      triggerBtn.style.cursor = disabled ? "not-allowed" : "";
    },

    setLoading(loading: boolean) {
      opts.loading = loading;
      updateLoading(loading);
      primaryBtn.disabled = loading;
    },

    openDropdown,
    closeDropdown,

    isDropdownOpen() { return isDropdownOpen; },

    destroy() {
      destroyed = true;
      menu.remove();
      root.remove();
    },
  };

  return instance;
}
