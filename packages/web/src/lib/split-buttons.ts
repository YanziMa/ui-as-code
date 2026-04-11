/**
 * Split Buttons / Button Group: Segmented control, dropdown split buttons,
 * toggle button groups, icon button bars, overflow menus, and action button groups.
 */

// --- Types ---

export type ButtonVariant = "default" | "primary" | "secondary" | "danger" | "ghost" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface SplitButtonOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Icon (emoji or HTML) */
  icon?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Tooltip */
  tooltip?: string;
  /** Badge count */
  badge?: number | string;
  /** Custom data */
  data?: unknown;
}

export interface SplitButtonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Button options */
  options: SplitButtonOption[];
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size */
  size?: ButtonSize;
  /** Selected value(s) */
  value?: string | string[];
  /** Allow multiple selection */
  multiple?: boolean;
  /** Full width? */
  fullWidth?: boolean;
  /** Show icons only on small screens? */
  iconOnly?: boolean;
  /** Callback when selection changes */
  onChange?: (value: string | string[]) => void;
  /** Callback for individual button click */
  onButtonClick?: (option: SplitButtonOption, event: MouseEvent) => void;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Gap between buttons (px) */
  gap?: number;
  /** Rounded pill shape? */
  pill?: boolean;
  /** Custom CSS class */
  className?: string;
  /** ARIA label */
  ariaLabel?: string;
  /** Show divider lines between buttons? */
  dividers?: boolean;
}

export interface SplitButtonInstance {
  element: HTMLElement;
  getValue(): string | string[] | null;
  setValue(value: string | string[]): void;
  setOptions(options: SplitButtonOption[]): void;
  enableOption(value: string): void;
  disableOption(value: string): void;
  destroy(): void;
}

// --- Style Maps ---

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; color: string; border: string; hoverBg: string; activeBg: string; activeColor: string }> = {
  default:   { bg: "#fff", color: "#374151", border: "#d1d5db", hoverBg: "#f9fafb", activeBg: "#f3f4f6", activeColor: "#111827" },
  primary:   { bg: "#4338ca", color: "#fff", border: "#3730a3", hoverBg: "#3730a3", activeBg: "#312e81", activeColor: "#e0e7ff" },
  secondary: { bg: "#f1f5f9", color: "#1e40af", border: "#bfdbfe", hoverBg: "#e0e7ff", activeBg: "#dbeafe", activeColor: "#1e3a5f" },
  danger:    { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", hoverBg: "#fee2e2", activeBg: "#fecaca", activeColor: "#b91c1c" },
  ghost:    { bg: "transparent", color: "#374151", border: "transparent", hoverBg: "#f3f4f6", activeBg: "#e5e7eb", activeColor: "#111827" },
  link:      { bg: "transparent", color: "#4338ca", border: "transparent", hoverBg: "rgba(67,56,202,0.08)", activeBg: "rgba(67,56,202,0.15)", activeColor: "#3730a3" },
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: string; height: string; borderRadius: string }> = {
  xs:  { padding: "3px 8px", fontSize: "11px", height: "22px", borderRadius: "4px" },
  sm:  { padding: "5px 12px", fontSize: "12px", height: "28px", borderRadius: "5px" },
  md:  { padding: "7px 16px", fontSize: "13px", height: "34px", borderRadius: "6px" },
  lg:  { padding: "10px 20px", fontSize: "14px", height: "40px", borderRadius: "8px" },
};

// --- Main Factory ---

export function createSplitButtons(options: SplitButtonOptions): SplitButtonInstance {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    multiple: options.multiple ?? false,
    fullWidth: options.fullWidth ?? false,
    gap: options.gap ?? -1, // -1 means no gap (connected)
    pill: options.pill ?? false,
    orientation: options.orientation ?? "horizontal",
    dividers: options.dividers ?? false,
    ariaLabel: options.ariaLabel ?? "Segmented control",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SplitButtons: container not found");

  let currentValue: string | string[] | null = options.value ?? null;

  // Root
  const root = document.createElement("div");
  root.className = `split-buttons ${opts.className ?? ""}`;
  root.setAttribute("role", opts.multiple ? "group" : "radiogroup");
  root.setAttribute("aria-label", opts.ariaLabel);
  root.style.cssText = `
    display:${opts.orientation === "vertical" ? "flex" : "inline-flex"};
    ${opts.orientation === "vertical" ? "flex-direction:column;" : ""}
    ${opts.fullWidth ? "width:100%;" : ""}
    gap:${opts.gap === -1 ? "0" : `${opts.gap}px`};
  `;
  container.appendChild(root);

  // State
  let destroyed = false;

  function render(): void {
    if (destroyed) return;
    root.innerHTML = "";

    const vs = VARIANT_STYLES[opts.variant];
    const ss = SIZE_STYLES[opts.size];

    opts.options.forEach((opt, idx) => {
      const isSelected = opts.multiple
        ? Array.isArray(currentValue) && currentValue.includes(opt.value)
        : currentValue === opt.value;
      const isDisabled = opt.disabled ?? false;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sb-btn";
      btn.dataset.value = opt.value;
      btn.dataset.index = String(idx);
      btn.disabled = isDisabled;
      btn.setAttribute("role", opts.multiple ? "checkbox" : "radio");
      btn.setAttribute("aria-checked", String(isSelected));
      if (opt.tooltip) btn.title = opt.tooltip;

      // Base styles
      const isConnected = idx > 0 && opts.gap === -1;
      btn.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;gap:6px;
        padding:${ss.padding};font-size:${ss.fontSize};height:${ss.height};
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:500;
        cursor:${isDisabled ? "not-allowed" : "pointer"};
        border:1px solid ${isConnected && !opts.dividers ? "transparent" : vs.border};
        background:${isSelected ? vs.activeBg : vs.bg};
        color:${isSelected ? vs.activeColor : vs.color};
        transition:all 150ms ease;white-space:nowrap;outline:none;
        ${idx === 0 ? `border-top-left-radius:${opts.pill ? "9999px" : ss.borderRadius};border-bottom-left-radius:${opts.pill ? "9999px" : ss.borderRadius};` : ""}
        ${idx === opts.options.length - 1 ? `border-top-right-radius:${opts.pill ? "9999px" : ss.borderRadius};border-bottom-right-radius:${opts.pill ? "9999px" : ss.borderRadius};` : ""}
        ${!isConnected || opts.dividers ? "" : "border-left:none;"}
        ${isSelected ? `box-shadow:inset 0 0 0 2px ${vs.activeBg === vs.bg ? "rgba(0,0,0,0.1)" : vs.activeBg};` : ""}
        opacity:${isDisabled ? "0.5" : "1"};
        flex:${opts.fullWidth ? "1" : "none"};
        position:relative;
      `;

      // Icon
      if (opt.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = opt.icon;
        iconEl.style.cssText = "display:flex;align-items:center;line-height:1;";
        btn.appendChild(iconEl);
      }

      // Label
      const label = document.createElement("span");
      label.textContent = opt.label;
      btn.appendChild(label);

      // Badge
      if (opt.badge !== undefined) {
        const badge = document.createElement("span");
        badge.className = "sb-badge";
        badge.style.cssText = `
          min-width:16px;height:16px;border-radius:99px;background:#ef4444;color:#fff;
          font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;
          padding:0 5px;margin-left:4px;
        `;
        badge.textContent = String(opt.badge);
        btn.appendChild(badge);
      }

      // Divider line
      if (opts.dividers && idx > 0) {
        btn.style.borderLeft = `1px solid #e5e7eb`;
      }

      // Events
      btn.addEventListener("click", (e) => {
        if (isDisabled) return;
        opts.onButtonClick?.(opt, e);

        if (opts.multiple) {
          const arr = Array.isArray(currentValue) ? [...currentValue] : [];
          if (arr.includes(opt.value)) {
            currentValue = arr.filter((v) => v !== opt.value);
          } else {
            arr.push(opt.value);
            currentValue = arr;
          }
        } else {
          currentValue = currentValue === opt.value ? null : opt.value;
        }

        opts.onChange?.(currentValue!);
        render();
      });

      // Hover effect
      if (!isDisabled) {
        btn.addEventListener("mouseenter", () => {
          if (!isSelected) {
            btn.style.background = vs.hoverBg;
          }
        });
        btn.addEventListener("mouseleave", () => {
          if (!isSelected) {
            btn.style.background = vs.bg;
          }
        });
      }

      root.appendChild(btn);
    });
  }

  // --- Public API ---

  const instance: SplitButtonInstance = {
    element: root,

    getValue() { return currentValue; },

    setValue(value: string | string[]) {
      currentValue = value;
      render();
    },

    setOptions(newOptions: SplitButtonOption[]) {
      opts.options = newOptions;
      render();
    },

    enableOption(value: string) {
      const opt = opts.options.find((o) => o.value === value);
      if (opt) opt.disabled = false;
      render();
    },

    disableOption(value: string) {
      const opt = opts.options.find((o) => o.value === value);
      if (opt) opt.disabled = true;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Initial render
  render();

  return instance;
}

// --- Convenience: Toggle Group ---

export interface ToggleGroupOptions {
  container: HTMLElement | string;
  options: Array<{ value: string; label: string; icon?: string }>;
  value?: string;
  onChange?: (value: string) => void;
  size?: ButtonSize;
  className?: string;
}

export function createToggleGroup(options: ToggleGroupOptions): SplitButtonInstance {
  return createSplitButtons({
    ...options,
    variant: "default",
    pill: true,
    fullWidth: true,
  });
}

// --- Convenience: Icon Bar ---

export interface IconButtonBarOptions {
  container: HTMLElement | string;
  buttons: Array<{
    id: string;
    icon: string;
    label: string;
    title?: string;
    disabled?: boolean;
    active?: boolean;
  }>;
  onClick?: (id: string, event: MouseEvent) => void;
  size?: ButtonSize;
  className?: string;
}

export function createIconButtonBar(options: IconButtonBarOptions): {
  element: HTMLElement;
  setActive(id: string): void;
  destroy: () => void;
} {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  const bar = document.createElement("div");
  bar.className = `icon-bar ${options.className ?? ""}`;
  bar.style.cssText = `
    display:inline-flex;gap:2px;padding:4px;
  `;
  container.appendChild(bar);

  let activeId: string | null = options.buttons.find((b) => b.active)?.id ?? null;

  options.buttons.forEach((btn) => {
    const el = document.createElement("button");
    el.type = "button";
    el.innerHTML = btn.icon;
    el.title = btn.title ?? btn.label;
    el.disabled = btn.disabled ?? false;
    el.dataset.id = btn.id;
    el.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:6px;border:1px solid transparent;
      background:${el.dataset.id === activeId ? "#eff6ff" : "transparent"};
      color:${el.dataset.id === activeId ? "#2563eb" : "#6b7280"};
      cursor:pointer;font-size:14px;transition:all 150ms;
      outline:none;
    `;

    el.addEventListener("click", (e) => {
      if (btn.disabled) return;
      activeId = btn.id;
      options.onClick?.(btn.id, e);
      // Update visual state
      bar.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
        b.style.background = b.dataset.id === activeId ? "#eff6ff" : "transparent";
        b.style.color = b.dataset.id === activeId ? "#2563eb" : "#6b7280";
      });
    });

    el.addEventListener("mouseenter", () => {
      if (!btn.disabled && el.dataset.id !== activeId) el.style.background = "#f3f4f6";
    });
    el.addEventListener("mouseleave", () => {
      if (!btn.disabled && el.dataset.id !== activeId) el.style.background = "transparent";
    });

    bar.appendChild(el);
  });

  return {
    element: bar,
    setActive(id: string) {
      activeId = id;
      bar.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
        b.style.background = b.dataset.id === id ? "#eff6ff" : "transparent";
        b.style.color = b.dataset.id === id ? "#2563eb" : "#6b7280";
      });
    },
    destroy() { bar.remove(); },
  };
}
