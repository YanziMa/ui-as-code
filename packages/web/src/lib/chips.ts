/**
 * Chips: Tag/chip component with removable, clickable, icon, avatar,
 * color variants, input mode, group layout, and keyboard support.
 */

// --- Types ---

export type ChipVariant = "default" | "primary" | "success" | "warning" | "error" | "outline";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipOptions {
  /** Label text */
  label: string;
  /** Icon (emoji or HTML string) */
  icon?: string;
  /** Avatar URL or initials fallback */
  avatar?: string;
  /** Avatar size in px */
  avatarSize?: number;
  /** Color variant */
  variant?: ChipVariant;
  /** Size */
  size?: ChipSize;
  /** Removable? (shows X button) */
  removable?: boolean;
  /** Clickable/selected state */
  selected?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Close/removal callback */
  onRemove?: () => void;
  /** Click callback */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChipGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Array of chip definitions */
  chips: (ChipOptions | string)[];
  /** Allow adding new chips via input? */
  inputMode?: boolean;
  /** Input placeholder */
  inputPlaceholder?: string;
  /** Max chips limit */
  maxChips?: number;
  /** Separator between chips */
  gap?: number;
  /** Wrap or horizontal scroll? */
  wrap?: boolean;
  /** Callback when chip added */
  onAdd?: (label: string) => void;
  /** Callback when chip removed */
  onRemove?: (index: number, chip: ChipOptions) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChipGroupInstance {
  element: HTMLElement;
  getChips: () => ChipOptions[];
  addChip: (chip: ChipOptions) => void;
  removeChip: (index: number) => void;
  clearAll: () => void;
  destroy: () => void;
}

// --- Variant Styles ---

const VARIANT_STYLES: Record<ChipVariant, { bg: string; color: string; border: string; hoverBg: string; activeBg: string; activeColor: string }> = {
  default: { bg: "#fff", color: "#374151", border: "#d1d5db", hoverBg: "#f9fafb", activeBg: "#eef2ff", activeColor: "#4338ca" },
  primary: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", hoverBg: "#dbeafe", activeBg: "#4338ca", activeColor: "#fff" },
  success: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", hoverBg: "#dcfce7", activeBg: "#22c55e", activeColor: "#fff" },
  warning: { bg: "#fffbeb", color: "#92400e", border: "#fde68a", hoverBg: "#fef3c7", activeBg: "#f59e0b", activeColor: "#fff" },
  error:   { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", hoverBg:"#fee2e2", activeBg: "#ef4444", activeColor: "#fff" },
  outline: { bg: "transparent", color: "#374151", border: "#d1d5db", hoverBg: "#f3f4f6", activeBg: "#eef2ff", activeColor: "#4338ca" },
};

const SIZE_STYLES: Record<ChipSize, { fontSize: number; paddingX: number; paddingY: number; height: number; borderRadius: number }> = {
  sm: { fontSize: 12, paddingX: 8, paddingY: 3, height: 24, borderRadius: 6 },
  md: { fontSize: 13, paddingX: 10, paddingY: 5, height: 30, borderRadius: 8 },
  lg: { fontSize: 14, paddingX: 12, paddingY: 7, height: 36, radius: 10 },
};

// --- Single Chip ---

function createChipElement(options: ChipOptions): HTMLElement {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    removable: options.removable ?? false,
    selected: options.selected ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const vs = VARIANT_STYLES[opts.variant];
  const sz = SIZE_STYLES[opts.size];

  const el = document.createElement("div");
  el.className = `chip chip-${opts.variant} chip-${opts.size} ${opts.selected ? "chip-selected" : ""} ${opts.disabled ? "chip-disabled" : ""} ${opts.className}`;
  el.dataset.label = opts.label;

  const baseStyle = `
    display:inline-flex;align-items:center;gap:6px;height:${sz.height}px;
    background:${opts.selected ? vs.activeBg : vs.bg};
    color:${opts.selected ? vs.activeColor : vs.color};
    border:1px solid ${opts.selected ? vs.variant === "outline" ? vs.border : vs.color : vs.border};
    border-radius:${sz.borderRadius}px;font-family:-apple-system,sans-serif;
    font-size:${sz.fontSize}px;font-weight:500;white-space:nowrap;
    cursor:${opts.disabled ? "not-allowed" : "default"};
    transition:all 0.15s ease;padding:0 ${sz.paddingX}px 0;
    line-height:1;user-select:none;-webkit-user-select:none;
    ${opts.disabled ? "opacity:0.5;" : ""}
  `;
  el.style.cssText = baseStyle;

  // Avatar
  if (opts.avatar) {
    const av = document.createElement("span");
    av.style.cssText = `
      width:${opts.avatarSize ?? sz.height - 8}px;height:${opts.avatarSize ?? sz.height - 8}px;
      border-radius:50%;background:#e2e8f0;color:#64748b;
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.floor((opts.avatarSize ?? sz.height - 8) * 0.6)}px;font-weight:600;
      flex-shrink:0;overflow:hidden;text-overflow:ellipsis;
    `;
    // Check if it looks like a URL
    if (/^https?:\/|^data:image|^\/\//i.test(opts.avatar)) {
      const img = document.createElement("img");
      img.src = opts.avatar;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:none;";
      img.onload = () => { av.innerHTML = ""; av.appendChild(img); };
      av.textContent = opts.avatar.slice(0, 1).toUpperCase();
    } else {
      av.textContent = opts.avatar.length > 2 ? opts.avatar.slice(0, 2).toUpperCase() : opts.avatar;
    }
    el.appendChild(av);
  }

  // Icon
  if (opts.icon) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = opts.icon;
    iconEl.style.cssText = "font-size:inherit;line-height:1;";
    el.appendChild(iconEl);
  }

  // Label
  const labelEl = document.createElement("span");
  labelEl.className = "chip-label";
  labelEl.textContent = opts.label;
  labelEl.style.cssText = "max-width:150px;overflow:hidden;text-overflow:ellipsis;";
  el.appendChild(labelEl);

  // Remove button
  if (opts.removable && !opts.disabled) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = "&times;";
    removeBtn.setAttribute("aria-label", `Remove ${opts.label}`);
    removeBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:14px;color:#9ca3af;
      padding:0 2px;border-radius:4px;line-height:1;margin-left:2px;
      flex-shrink:0;
    `;
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onRemove?.();
      if (el.parentElement) el.remove();
    });
    removeBtn.addEventListener("mouseenter", () => { removeBtn.style.color = "#ef4444"; });
    removeBtn.addEventListener("mouseleave", () => { removeBtn.color = "#9ca3af"; });
    el.appendChild(removeBtn);
  }

  // Events
  if (!opts.disabled) {
    el.addEventListener("click", () => {
      opts.onClick?.();
    });
    el.addEventListener("mouseenter", () => {
      if (!opts.selected) el.style.background = vs.hoverBg;
    });
    el.addEventListener("mouseleave", () => {
      if (!opts.selected) el.style.background = opts.selected ? vs.activeBg : vs.bg;
    });
  }

  return el;
}

// --- Chip Group ---

export function createChipGroup(options: ChipGroupOptions): ChipGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ChipGroup: container not found");

  let chips: ChipOptions[] = options.chips.map((c) =>
    typeof c === "string" ? { label: c } : c
  );

  const opts = {
    gap: options.gap ?? 6,
    wrap: options.wrap ?? true,
    maxChips: options.maxChips ?? 20,
    inputPlaceholder: options.inputPlaceholder ?? "Type and press Enter...",
    ...options,
  };

  const wrapper = document.createElement("div");
  wrapper.className = `chip-group ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    display:flex;flex-wrap:${opts.wrap ? "wrap" : "nowrap"};gap:${opts.gap}px;
    align-items:center;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  function render(): void {
    wrapper.innerHTML = "";

    for (const chip of chips) {
      const el = createElement(chip);
      wrapper.appendChild(el);
    }

    // Input mode
    if (opts.inputMode && chips.length < opts.maxChips) {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = opts.inputPlaceholder;
      input.style.cssText = `
        border:none;outline:none;background:transparent;font-size:13px;
        color:#374151;min-width:80px;caret-color:#4338ca;
        font-family:inherit;
      `;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) {
          const label = input.value.trim();
          if (label && !chips.some((c) => c.label === label)) {
            const newChip: ChipOptions = { label };
            chips.push(newChip);
            opts.onAdd?.(label);
            render();
          }
          input.value = "";
        }
      });
      wrapper.appendChild(input);
    }
  }

  function createElement(chip: ChipOptions): HTMLElement {
    return createChipElement({
      ...chip,
      onRemove: () => {
        const idx = chips.findIndex((c) => c.label === chip.label);
        if (idx >= 0) {
          chips.splice(idx, 1);
          opts.onRemove?.(idx, chip);
          render();
        }
      },
    });
  }

  // Initial render
  render();

  return {
    element: wrapper,
    getChips: () => [...chips],
    addChip(chip: ChipOptions) {
      chips.push(chip);
      opts.onAdd?.(chip.label);
      render();
    },
    removeChip(index: number) {
      if (index >= 0 && index < chips.length) {
        chips.splice(index, 1);
        opts.onRemove?.(index, chips[index]!);
        render();
      }
    },
    clearAll() {
      chips = [];
      render();
    },
    destroy() {
      wrapper.remove();
    },
  };
}
