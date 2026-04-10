/**
 * Chip / Tag Component: Dismissible tags, selectable chips, input chips,
 * avatar chips, icon chips, chip groups, sizes, variants, and accessibility.
 */

// --- Types ---

export type ChipSize = "sm" | "md" | "lg";
export type ChipVariant = "default" | "filled" | "outlined" | "primary" | "danger";

export interface ChipOptions {
  /** Container element or selector (if omitted, returns standalone element) */
  container?: HTMLElement | string;
  /** Label text */
  label: string;
  /** Avatar/image URL */
  avatar?: string;
  /** Leading icon (emoji or SVG) */
  icon?: string;
  /** Trailing icon (emoji or SVG) */
  trailingIcon?: string;
  /** Dismissible? */
  dismissible?: boolean;
  /** Selectable? */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: ChipSize;
  /** Visual variant */
  variant?: ChipVariant;
  /** Click handler */
  onClick?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChipInstance {
  element: HTMLElement;
  setSelected: (selected: boolean) => void;
  isSelected: () => boolean;
  setLabel: (label: string) => void;
  dismiss: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<ChipSize, { height: number; fontSize: number; padding: number; iconSize: number; avatarSize: number }> = {
  sm: { height: 24, fontSize: 12, padding: 8, iconSize: 14, avatarSize: 18 },
  md: { height: 32, fontSize: 13, padding: 12, iconSize: 16, avatarSize: 22 },
  lg: { height: 38, fontSize: 14, padding: 14, iconSize: 18, avatarSize: 26 },
};

const VARIANT_STYLES: Record<ChipVariant, {
  bg: string; color: string; border: string; selectedBg: string; selectedColor: string;
}> = {
  default:   { bg: "#f3f4f6", color: "#374151", border: "transparent", selectedBg: "#e0e7ff", selectedColor: "#4338ca" },
  filled:    { bg: "#e5e7eb", color: "#374151", border: "transparent", selectedBg: "#c7d2fe", selectedColor: "#3730a3" },
  outlined:  { bg: "transparent", color: "#374151", border: "#d1d5db", selectedBg: "#eef2ff", selectedColor: "#4338ca" },
  primary:   { bg: "#eef2ff", color: "#4338ca", border: "transparent", selectedBg: "#4338ca", selectedColor: "#fff" },
  danger:    { bg: "#fef2f2", color: "#dc2626", border: "transparent", selectedBg: "#fecaca", selectedColor: "#dc2626" },
};

// --- Main Factory ---

export function createChip(options: ChipOptions): ChipInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    dismissible: options.dismissible ?? false,
    selected: options.selected ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_STYLES[opts.size];
  const v = VARIANT_STYLES[opts.variant];

  // Build chip
  const el = document.createElement("div");
  el.className = `chip chip-${opts.variant} chip-${opts.size} ${opts.className}`;
  el.setAttribute("role", "option");
  el.setAttribute("aria-selected", String(opts.selected));
  el.style.cssText = `
    display:inline-flex;align-items:center;gap:${Math.max(4, sz.padding / 3)}px;
    height:${sz.height}px;padding:0 ${sz.padding}px;
    background:${opts.selected ? v.selectedBg : v.bg};
    color:${opts.selected ? v.selectedColor : v.color};
    border:1.5px solid ${opts.selected ? v.selectedColor : v.border};
    border-radius:${sz.height / 2}px;font-family:-apple-system,sans-serif;
    font-size:${sz.fontSize}px;font-weight:500;line-height:1;
    cursor:${opts.disabled ? "not-allowed" : "pointer"};
    user-select:none;white-space:nowrap;transition:all 0.15s ease;
    ${opts.disabled ? "opacity:0.5;" : ""}
  `;

  // Avatar
  if (options.avatar) {
    const avEl = document.createElement("span");
    avEl.style.cssText = `
      width:${sz.avatarSize}px;height:${sz.avatarSize}px;border-radius:50%;
      object-fit:cover;background:#d1d5db;display:block;
      flex-shrink:0;background-size:cover;background-position:center;
      background-image:url(${options.avatar});
    `;
    el.appendChild(avEl);
  }

  // Leading icon
  if (options.icon) {
    const iconEl = document.createElement("span");
    iconEl.textContent = options.icon;
    iconEl.style.cssText = `font-size:${sz.iconSize}px;flex-shrink:0;display:flex;align-items:center;`;
    el.appendChild(iconEl);
  }

  // Label
  const labelEl = document.createElement("span");
  labelEl.textContent = opts.label;
  labelEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;";
  el.appendChild(labelEl);

  // Trailing icon
  if (options.trailingIcon) {
    const trailEl = document.createElement("span");
    trailEl.textContent = options.trailingIcon;
    trailEl.style.cssText = `font-size:${sz.iconSize}px;flex-shrink:0;display:flex;align-items:center;margin-left:2px;`;
    el.appendChild(trailEl);
  }

  // Dismiss button
  let dismissBtn: HTMLButtonElement | null = null;
  if (opts.dismissible) {
    dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.innerHTML = "&times;";
    dismissBtn.setAttribute("aria-label", "Remove");
    dismissBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:14px;line-height:1;
      color:inherit;opacity:0.55;padding:0 1px;border-radius:50%;
      flex-shrink:0;display:flex;align-items:center;transition:opacity 0.15s;
    `;
    dismissBtn.addEventListener("mouseenter", () => { dismissBtn!.style.opacity = "1"; });
    dismissBtn.addEventListener("mouseleave", () => { dismissBtn!.style.opacity = "0.55"; });
    dismissBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onDismiss?.();
      instance.dismiss();
    });
    el.appendChild(dismissBtn);
  }

  // Event handlers
  if (!opts.disabled && opts.onClick) {
    el.addEventListener("click", () => opts.onClick!());
  }
  if (!opts.disabled) {
    el.addEventListener("mouseenter", () => {
      if (!opts.selected) el.style.background = shadeColor(v.bg, -10);
    });
    el.addEventListener("mouseleave", () => {
      if (!opts.selected) el.style.background = v.bg;
    });
  }

  // Append to container if provided
  if (options.container) {
    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
    if (container) container.appendChild(el);
  }

  const instance: ChipInstance = {
    element: el,

    setSelected(selected: boolean) {
      opts.selected = selected;
      el.style.background = selected ? v.selectedBg : v.bg;
      el.style.color = selected ? v.selectedColor : v.color;
      el.style.borderColor = selected ? v.selectedColor : v.border;
      el.setAttribute("aria-selected", String(selected));
    },

    isSelected() { return opts.selected; },

    setLabel(label: string) {
      opts.label = label;
      labelEl.textContent = label;
    },

    dismiss() {
      el.remove();
    },

    destroy() { el.remove(); },
  };

  return instance;
}

// --- Chip Group ---

export interface ChipGroupOptions {
  container: HTMLElement | string;
  items: Array<Omit<ChipOptions, "container"> & { value: string }>;
  multiSelect?: boolean;
  size?: ChipSize;
  variant?: ChipVariant;
  onChange?: (selectedValues: string[]) => void;
  className?: string;
}

export interface ChipGroupInstance {
  element: HTMLElement;
  getSelected: () => string[];
  setSelected: (values: string[]) => void;
  addItem: (item: Omit<ChipOptions, "container"> & { value: string }) => void;
  removeItem: (value: string) => void;
  destroy: () => void;
}

export function createChipGroup(options: ChipGroupOptions): ChipGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ChipGroup: container not found");

  const wrapper = document.createElement("div");
  wrapper.className = `chip-group ${options.className ?? ""}`;
  wrapper.style.cssText = `display:flex;flex-wrap:wrap;gap:6px;align-items:center;`;
  container.appendChild(wrapper);

  const instances = new Map<string, ChipInstance>();
  let selectedSet = new Set<string>();

  for (const item of options.items) {
    const itemContainer = document.createElement("span");
    wrapper.appendChild(itemContainer);

    const inst = createChip({
      ...item,
      container: itemContainer,
      size: options.size,
      variant: options.variant,
      selected: false,
      onClick() {
        if (options.multiSelect) {
          if (selectedSet.has(item.value)) selectedSet.delete(item.value);
          else selectedSet.add(item.value);
        } else {
          selectedSet.clear();
          selectedSet.add(item.value);
        }
        // Update all visuals
        for (const [v, inst] of instances) {
          inst.setSelected(selectedSet.has(v));
        }
        options.onChange?.([...selectedSet]);
      },
    });

    instances.set(item.value, inst);
  }

  return {
    element: wrapper,

    getSelected() { return [...selectedSet]; },

    setSelected(values: string[]) {
      selectedSet = new Set(values);
      for (const [v, inst] of instances) {
        inst.setSelected(selectedSet.has(v));
      }
    },

    addItem(item) {
      const itemContainer = document.createElement("span");
      wrapper.appendChild(itemContainer);
      const inst = createChip({
        ...item,
        container: itemContainer,
        size: options.size,
        variant: options.variant,
        selected: selectedSet.has(item.value),
        onClick() {
          if (options.multiSelect) {
            if (selectedSet.has(item.value)) selectedSet.delete(item.value);
            else selectedSet.add(item.value);
          } else {
            selectedSet.clear();
            selectedSet.add(item.value);
          }
          for (const [v, i] of instances) { i.setSelected(selectedSet.has(v)); }
          options.onChange?.([...selectedSet]);
        },
      });
      instances.set(item.value, inst);
    },

    removeItem(value: string) {
      instances.get(value)?.destroy();
      instances.delete(value);
      selectedSet.delete(value);
    },

    destroy() {
      for (const [, inst] of instances) inst.destroy();
      wrapper.remove();
    },
  };
}

// --- Utility ---

function shadeColor(hex: string, percent: number): string {
  const num = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(num.slice(0, 2), 16) + percent));
  const g = Math.max(0, Math.min(255, parseInt(num.slice(2, 4), 16) + percent));
  const b = Math.max(0, Math.min(255, parseInt(num.slice(4, 6), 16) + percent));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
