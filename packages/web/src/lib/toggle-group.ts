/**
 * Toggle Group / Segmented Control: Button-like toggle group with
 * icons, labels, single/multi-select, disabled states, sizes,
 * animations, and keyboard navigation.
 */

// --- Types ---

export type ToggleSize = "sm" | "md" | "lg";
export type ToggleVariant = "default" | "pill" | "outline";

export interface ToggleOption {
  /** Value */
  value: string;
  /** Display label */
  label: string;
  /** Icon/emoji */
  icon?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Tooltip text */
  title?: string;
  /** Custom badge/count */
  badge?: string | number;
}

export interface ToggleGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Toggle options */
  options: ToggleOption[];
  /** Allow multiple selections? */
  multiple?: boolean;
  /** Default selected value(s) */
  defaultValue?: string | string[];
  /** Size variant */
  size?: ToggleSize;
  /** Visual variant */
  variant?: ToggleVariant;
  /** Active color (hex) */
  activeColor?: string;
  /** Full width? */
  fullWidth?: boolean;
  /** Callback on change */
  onChange?: (value: string | string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ToggleGroupInstance {
  element: HTMLElement;
  getValue: () => string | string[];
  setValue: (value: string | string[]) => void;
  getSelected: () => ToggleOption[];
  setDisabled: (value: string, disabled: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<ToggleSize, { height: string; padding: string; fontSize: string; iconSize: string; gap: string }> = {
  sm: { height: "28px", padding: "4px 10px", fontSize: "11px", iconSize: "12px", gap: "2px" },
  md: { height: "34px", padding: "6px 14px", fontSize: "12px", iconSize: "13px", gap: "3px" },
  lg: { height: "40px", padding: "8px 18px", fontSize: "13px", iconSize: "15px", gap: "4px" },
};

// --- Main Factory ---

export function createToggleGroup(options: ToggleGroupOptions): ToggleGroupInstance {
  const opts = {
    multiple: options.multiple ?? false,
    defaultValue: options.defaultValue ?? "",
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    activeColor: options.activeColor ?? "#4338ca",
    fullWidth: options.fullWidth ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ToggleGroup: container not found");

  container.className = `toggle-group tg-${opts.variant} ${opts.className}`;
  let selected: Set<string> = new Set(
    Array.isArray(opts.defaultValue) ? opts.defaultValue :
    opts.defaultValue ? [opts.defaultValue] : []
  );
  let destroyed = false;

  const sz = SIZE_STYLES[opts.size];

  function render(): void {
    container.innerHTML = "";

    // Group wrapper
    const group = document.createElement("div");
    group.className = "toggle-group-track";
    group.setAttribute("role", opts.multiple ? "group" : "radiogroup");
    group.style.cssText = `
      display:inline-flex;${opts.fullWidth ? "width:100%;" : ""}
      background:${opts.variant === "outline" ? "transparent" : "#f3f4f6"};
      border:${opts.variant === "outline" ? `1px solid #d1d5db` : "none"};
      border-radius:${opts.variant === "pill" ? "9999px" : "8px"};
      padding:${opts.variant === "outline" ? "2px" : "3px"};
      gap:2px;
      font-family:-apple-system,sans-serif;
    `;
    container.appendChild(group);

    for (const opt of options.options) {
      group.appendChild(renderToggle(opt));
    }
  }

  function renderToggle(opt: ToggleOption): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `toggle-option tg-${opt.value}`;
    btn.dataset.value = opt.value;
    btn.disabled = opt.disabled ?? false;
    btn.title = opt.title ?? opt.label;

    if (opts.multiple) {
      btn.setAttribute("role", "checkbox");
      btn.setAttribute("aria-checked", String(selected.has(opt.value)));
    } else {
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", String(selected.has(opt.value)));
    }

    const isActive = selected.has(opt.value);

    // Base styles
    let cssText = `
      display:inline-flex;align-items:center;justify-content:center;gap:${sz.gap};
      height:${sz.height};padding:${sz.padding};font-size:${sz.fontSize};
      font-weight:500;border-radius:${opts.variant === "pill" ? "9999px" : "6px"};
      border:none;cursor:pointer;white-space:nowrap;transition:all 0.15s ease;
      flex:1;min-width:0;position:relative;line-height:1.3;
    `;

    switch (opts.variant) {
      case "default":
        cssText += isActive
          ? `background:#fff;color:${opts.activeColor};box-shadow:0 1px 3px rgba(0,0,0,0.1);`
          : `background:transparent;color:#6b7280;`;
        break;
      case "pill":
        cssText += isActive
          ? `background:${opts.activeColor};color:#fff;box-shadow:0 1px 4px rgba(67,53,202,0.25);`
          : `background:transparent;color:#6b7280;`;
        break;
      case "outline":
        cssText += isActive
          ? `background:${opts.activeColor}10;color:${opts.activeColor};border:1px solid ${opts.activeColor}30;`
          : `background:transparent;color:#6b7280;border:1px solid transparent;`;
        break;
    }

    if (opt.disabled) {
      cssText += "opacity:0.4;cursor:not-allowed;pointer-events:none;";
    }

    btn.style.cssText = cssText;

    // Icon
    if (opt.icon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = opt.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize};line-height:1;flex-shrink:0;`;
      btn.appendChild(iconEl);
    }

    // Label
    const labelEl = document.createElement("span");
    labelEl.textContent = opt.label;
    labelEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;";
    btn.appendChild(labelEl);

    // Badge
    if (opt.badge !== undefined) {
      const badgeEl = document.createElement("span");
      badgeEl.className = "tg-badge";
      badgeEl.style.cssText = `
        font-size:9px;font-weight:600;background:${isActive ? "rgba(255,255,255,0.25)" : "#e5e7eb"};
        color:${isActive ? "#fff" : "#6b7280"};padding:0 4px;border-radius:99px;
        line-height:1.4;margin-left:2px;
      `;
      badgeEl.textContent = String(opt.badge);
      btn.appendChild(badgeEl);
    }

    // Events
    if (!opt.disabled) {
      btn.addEventListener("click", () => select(opt.value));
      btn.addEventListener("mouseenter", () => {
        if (!selected.has(opt.value)) {
          btn.style.background = opts.variant === "pill"
            ? `${opts.activeColor}10` : opts.variant === "outline"
              ? "#f9fafb" : "rgba(255,255,255,0.6)";
        }
      });
      btn.addEventListener("mouseleave", () => {
        if (!selected.has(opt.value)) render(); // re-render to reset style
      });
    }

    return btn;
  }

  function select(value: string): void {
    if (opts.multiple) {
      if (selected.has(value)) selected.delete(value); else selected.add(value);
    } else {
      selected.clear();
      selected.add(value);
    }
    render();
    opts.onChange?.(opts.multiple ? Array.from(selected) : Array.from(selected)[0]!);
  }

  render();

  return {
    element: container,

    getValue() {
      return opts.multiple ? Array.from(selected) : Array.from(selected)[0] ?? "";
    },

    setValue(value: string | string[]) {
      selected = new Set(Array.isArray(value) ? value : [value]);
      render();
    },

    getSelected() {
      return options.options.filter((o) => selected.has(o.value));
    },

    setDisabled(value: string, disabled: boolean) {
      const opt = options.options.find((o) => o.value === value);
      if (opt) opt.disabled = disabled;
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };
}
