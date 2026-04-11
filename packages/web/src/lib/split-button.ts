/**
 * Split Button: Primary action button with a dropdown trigger for secondary actions.
 * Supports sizes, variants, disabled state, loading spinner, keyboard navigation,
 * and customizable dropdown content rendering.
 */

// --- Types ---

export type SplitButtonSize = "xs" | "sm" | "md" | "lg";
export type SplitButtonVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline" | "ghost";

export interface SplitAction {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji or HTML string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Danger/destructive action */
  danger?: boolean;
  /** Separator before this item */
  separatorBefore?: boolean;
  /** Action callback */
  onClick: () => void;
}

export interface SplitButtonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Primary button label */
  primaryLabel: string;
  /** Primary button icon */
  primaryIcon?: string;
  /** Primary action callback */
  onPrimaryClick: () => void;
  /** Dropdown actions */
  actions: SplitAction[];
  /** Size variant */
  size?: SplitButtonSize;
  /** Visual variant */
  variant?: SplitButtonVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner on primary) */
  loading?: boolean;
  /** Dropdown placement */
  placement?: "bottom-end" | "bottom-start" | "top-end" | "top-start";
  /** Show dropdown arrow icon */
  showArrow?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Callback when dropdown opens */
  onDropdownOpen?: () => void;
  /** Callback when dropdown closes */
  onDropdownClose?: () => void;
}

export interface SplitButtonInstance {
  element: HTMLElement;
  /** Open the dropdown */
  openDropdown: () => void;
  /** Close the dropdown */
  closeDropdown: () => void;
  /** Toggle dropdown */
  toggleDropdown: () => void;
  /** Check if dropdown is open */
  isDropdownOpen: () => boolean;
  /** Update actions dynamically */
  setActions: (actions: SplitAction[]) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<SplitButtonSize, { paddingX: number; paddingY: number; fontSize: number; iconSize: number; gap: number; borderRadius: number }> = {
  xs: { paddingX: 10, paddingY: 5, fontSize: 12, iconSize: 14, gap: 4, borderRadius: 4 },
  sm: { paddingX: 14, paddingY: 7, fontSize: 13, iconSize: 15, gap: 5, borderRadius: 6 },
  md: { paddingX: 16, paddingY: 9, fontSize: 14, iconSize: 16, gap: 6, borderRadius: 7 },
  lg: { paddingX: 20, paddingY: 11, fontSize: 15, iconSize: 18, gap: 8, borderRadius: 8 },
};

const VARIANT_STYLES: Record<SplitButtonVariant, { bg: string; color: string; border: string; hoverBg: string; activeBg: string }> = {
  default:   { bg: "#fff", color: "#374151", border: "#d1d5db", hoverBg: "#f9fafb", activeBg: "#f3f4f6" },
  primary:   { bg: "#4338ca", color: "#fff", border: "#3730a3", hoverBg: "#3730a3", activeBg: "#2d2870" },
  success:   { bg: "#16a34a", color: "#fff", border: "#15803d", hoverBg: "#15803d", activeBg: "#146c29" },
  warning:   { bg: "#d97706", color: "#fff", border: "#b45309", hoverBg: "#b45309", activeBg: "#a34700" },
  danger:    { bg: "#dc2626", color: "#fff", border: "#b91c1c", hoverBg: "#b91c1c", activeBg: "#a11e1e" },
  outline:   { bg: "#fff", color: "#374151", border: "#d1d5db", hoverBg: "#eff6ff", activeBg: "#dbeafe" },
  ghost:     { bg: "transparent", color: "#374151", border: "transparent", hoverBg: "#f3f4f6", activeBg: "#e5e7eb" },
};

// --- Main Class ---

export class SplitButtonManager {
  create(options: SplitButtonOptions): SplitButtonInstance {
    const opts = {
      size: options.size ?? "md",
      variant: options.variant ?? "default",
      disabled: options.disabled ?? false,
      loading: options.loading ?? false,
      showArrow: options.showArrow ?? true,
      placement: options.placement ?? "bottom-end",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("SplitButton: container not found");

    const sz = SIZE_STYLES[opts.size];
    const vs = VARIANT_STYLES[opts.variant];

    let actions = [...options.actions];
    let isOpen = false;
    let destroyed = false;

    // Root wrapper
    const root = document.createElement("div");
    root.className = `split-btn ${opts.className ?? ""}`;
    root.style.cssText = "display:inline-flex;position:relative;";
    container.appendChild(root);

    // Primary button
    const primaryBtn = document.createElement("button");
    primaryBtn.type = "button";
    primaryBtn.className = "split-btn-primary";
    primaryBtn.style.cssText = `
      display:inline-flex;align-items:center;gap:${sz.gap}px;
      padding:${sz.paddingY}px ${sz.paddingX}px;
      font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;font-weight:500;
      color:${vs.color};background:${vs.bg};border:1px solid ${vs.border};
      border-radius:${sz.borderRadius}px 0 0 ${sz.borderRadius}px;
      cursor:pointer;white-space:nowrap;line-height:1;
      transition:background 0.15s,border-color 0.15s,color 0.15s;
      ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
    `;
    root.appendChild(primaryBtn);

    // Primary content
    if (options.primaryIcon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = options.primaryIcon;
      iconEl.style.cssText = `display:flex;align-items:center;font-size:${sz.iconSize}px;`;
      primaryBtn.appendChild(iconEl);
    }
    const primaryLabelEl = document.createElement("span");
    primaryLabelEl.textContent = options.primaryLabel;
    primaryBtn.appendChild(primaryLabelEl);

    // Loading spinner (hidden by default)
    const spinnerEl = document.createElement("span");
    spinnerEl.className = "split-btn-spinner";
    spinnerEl.style.cssText = `
      display:none;width:${sz.fontSize}px;height:${sz.fontSize}px;
      border:2px solid transparent;border-top-color:${vs.color};
      border-radius:50%;animation:sb-spin 0.6s linear infinite;
    `;
    primaryBtn.appendChild(spinnerEl);

    // Dropdown trigger button
    const triggerBtn = document.createElement("button");
    triggerBtn.type = "button";
    triggerBtn.className = "split-btn-trigger";
    triggerBtn.setAttribute("aria-haspopup", "true");
    triggerBtn.setAttribute("aria-expanded", "false");
    triggerBtn.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      padding:${sz.paddingY}px ${sz.paddingX / 1.5}px;
      background:${vs.bg};border:1px solid ${vs.border};
      border-left:none;border-radius:0 ${sz.borderRadius}px ${sz.borderRadius}px 0;
      cursor:pointer;color:${vs.color};
      transition:background 0.15s,border-color 0.15s;
      ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
    `;
    root.appendChild(triggerBtn);

    // Arrow icon
    if (opts.showArrow) {
      const arrowIcon = document.createElement("span");
      arrowIcon.innerHTML = "&#9660;";
      arrowIcon.style.cssText = `font-size:${Math.max(10, sz.fontSize - 3)}px;transition:transform 0.2s;display:inline-block;`;
      triggerBtn.appendChild(arrowIcon);
    }

    // Dropdown panel
    const dropdown = document.createElement("div");
    dropdown.className = "split-btn-dropdown";
    dropdown.setAttribute("role", "menu");
    dropdown.style.cssText = `
      position:absolute;display:none;z-index:1000;
      min-width:160px;background:#fff;border:1px solid #e5e7eb;
      border-radius:${sz.borderRadius}px;
      box-shadow:0 10px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);
      padding:4px 0;font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;
      animation:sb-dropdown-in 0.12s ease-out;
      overflow:hidden;
    `;
    root.appendChild(dropdown);

    // Position dropdown based on placement
    function positionDropdown(): void {
      const rect = root.getBoundingClientRect();
      switch (opts.placement) {
        case "bottom-end":
          dropdown.style.top = `${rect.height + 4}px`;
          dropdown.style.right = "0";
          dropdown.style.left = "auto";
          break;
        case "bottom-start":
          dropdown.style.top = `${rect.height + 4}px`;
          dropdown.style.left = "0";
          dropdown.style.right = "auto";
          break;
        case "top-end":
          dropdown.style.bottom = `${rect.height + 4}px`;
          dropdown.style.right = "0";
          dropdown.style.left = "auto";
          break;
        case "top-start":
          dropdown.style.bottom = `${rect.height + 4}px`;
          dropdown.style.left = "0";
          dropdown.style.right = "auto";
          break;
      }
    }

    function renderDropdown(): void {
      dropdown.innerHTML = "";
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]!;

        if (action.separatorBefore && i > 0) {
          const sep = document.createElement("div");
          sep.style.cssText = "height:1px;background:#f0f0f0;margin:2px 8px;";
          dropdown.appendChild(sep);
        }

        const item = document.createElement("button");
        item.type = "button";
        item.className = "split-btn-item";
        item.setAttribute("role", "menuitem");
        item.dataset.key = action.key;
        item.style.cssText = `
          display:flex;align-items:center;gap:8px;
          width:100%;padding:${sz.paddingY / 1.5}px ${sz.paddingX}px;
          border:none;background:none;color:${action.danger ? "#dc2626" : "#374151"};
          cursor:pointer;font-size:${sz.fontSize}px;text-align:left;
          white-space:nowrap;transition:background 0.1s;
          ${action.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        `;

        if (action.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.innerHTML = action.icon;
          iconSpan.style.cssText = `font-size:${sz.iconSize - 2}px;display:flex;align-items:center;flex-shrink:0;`;
          item.appendChild(iconSpan);
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = action.label;
        labelSpan.style.flex = "1";
        item.appendChild(labelSpan);

        if (!action.disabled) {
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            action.onClick();
            closeDropdown();
          });
          item.addEventListener("mouseenter", () => { item.style.background = "#f0f4ff"; });
          item.addEventListener("mouseleave", () => { item.style.background = ""; });
        }

        dropdown.appendChild(item);
      }
    }

    function openDropdown(): void {
      if (isOpen || destroyed || opts.disabled) return;
      isOpen = true;
      renderDropdown();
      positionDropdown();
      dropdown.style.display = "block";

      // Rotate arrow
      const arrow = triggerBtn.querySelector("span:last-child");
      if (arrow) arrow.style.transform = "rotate(180deg)";

      triggerBtn.setAttribute("aria-expanded", "true");
      opts.onDropdownOpen?.();

      // Close on outside click
      setTimeout(() => {
        document.addEventListener("mousedown", handleOutsideClick);
      }, 0);
    }

    function closeDropdown(): void {
      if (!isOpen || destroyed) return;
      isOpen = false;
      dropdown.style.display = "none";

      const arrow = triggerBtn.querySelector("span:last-child");
      if (arrow) arrow.style.transform = "";

      triggerBtn.setAttribute("aria-expanded", "false");
      opts.onDropdownClose?.();
      document.removeEventListener("mousedown", handleOutsideClick);
    }

    function handleOutsideClick(e: MouseEvent): void {
      if (!root.contains(e.target as Node)) closeDropdown();
    }

    function toggleDropdown(): void {
      isOpen ? closeDropdown() : openDropdown();
    }

    function updateLoadingState(): void {
      if (opts.loading) {
        primaryLabelEl.style.display = "none";
        spinnerEl.style.display = "inline-block";
        primaryBtn.disabled = true;
      } else {
        primaryLabelEl.style.display = "";
        spinnerEl.style.display = "none";
        primaryBtn.disabled = opts.disabled;
      }
    }

    // Event bindings
    primaryBtn.addEventListener("click", () => {
      if (!opts.disabled && !opts.loading) options.onPrimaryClick();
    });

    triggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    // Keyboard nav within dropdown
    dropdown.addEventListener("keydown", (e: KeyboardEvent) => {
      const items = dropdown.querySelectorAll<HTMLButtonElement>(".split-btn-item:not([style*='opacity:0.45'])");
      const currentIdx = Array.from(items).indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (items.length > 0) {
            const nextIdx = (currentIdx + 1) % items.length;
            (items[nextIdx] as HTMLElement)?.focus();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (items.length > 0) {
            const prevIdx = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
            (items[prevIdx] as HTMLElement)?.focus();
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          triggerBtn.focus();
          break;
      }
    });

    // Escape to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeDropdown();
    });

    // Inject keyframes
    if (!document.getElementById("split-btn-styles")) {
      const s = document.createElement("style");
      s.id = "split-btn-styles";
      s.textContent = `
        @keyframes sb-spin{to{transform:rotate(360deg);}}
        @keyframes sb-dropdown-in{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
      `;
      document.head.appendChild(s);
    }

    // Initial render
    updateLoadingState();

    const instance: SplitButtonInstance = {
      element: root,

      openDropdown,
      closeDropdown,
      toggleDropdown,

      isDropdownOpen: () => isOpen,

      setActions(newActions) {
        actions = newActions;
        if (isOpen) renderDropdown();
      },

      setLoading(loading) {
        opts.loading = loading;
        updateLoadingState();
      },

      setDisabled(disabled) {
        opts.disabled = disabled;
        primaryBtn.disabled = disabled || opts.loading;
        primaryBtn.style.opacity = disabled ? "0.5" : "";
        primaryBtn.style.cursor = disabled ? "not-allowed" : "pointer";
        triggerBtn.disabled = disabled;
        triggerBtn.style.opacity = disabled ? "0.5" : "";
        triggerBtn.style.cursor = disabled ? "not-allowed" : "pointer";
      },

      destroy() {
        destroyed = true;
        closeDropdown();
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a split button */
export function createSplitButton(options: SplitButtonOptions): SplitButtonInstance {
  return new SplitButtonManager().create(options);
}
