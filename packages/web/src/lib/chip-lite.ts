/**
 * Lightweight Chip / Tag: Dismissible tags, selectable chips (single/multi via ChipGroup),
 * avatar/icon chips, 5 variants, 3 sizes, shadeColor utility.
 */

// --- Types ---

export type ChipVariant = "default" | "primary" | "success" | "warning" | "error";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Label text */
  label: string;
  /** Variant */
  variant?: ChipVariant;
  /** Size */
  size?: ChipSize;
  /** Dismissible? */
  dismissible?: boolean;
  /** Selected state (for use in ChipGroup) */
  selected?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Leading icon/emoji/HTML */
  leading?: string | HTMLElement;
  /** Trailing icon/HTML */
  trailing?: string | HTMLElement;
  /** Click handler */
  onClick?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChipInstance {
  element: HTMLElement;
  getLabel: () => string;
  setLabel: (label: string) => void;
  setSelected: (selected: boolean) => void;
  isSelected: () => boolean;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface ChipGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Chips data */
  chips: Array<{ label: string; value: string; disabled?: boolean; leading?: string }>;
  /** Selection mode */
  mode?: "none" | "single" | "multiple";
  /** Variant for all chips */
  variant?: ChipVariant;
  /** Size */
  size?: ChipSize;
  /** Callback on selection change */
  onChange?: (values: string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChipGroupInstance {
  element: HTMLElement;
  getValues: () => string[];
  setValues: (values: string[]) => void;
  getSelectedChips: () => string[];
  addChip: (label: string, value: string) => void;
  removeChip: (value: string) => void;
  destroy: () => void;
}

// --- Config ---

const VARIANT_STYLES: Record<ChipVariant, { bg: string; color: string; border: string; selectedBg: string; selectedColor: string }> = {
  default:  { bg: "#f3f4f6", color: "#374151", border: "transparent", selectedBg: "#e0e7ff", selectedColor: "#4338ca" },
  primary:  { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe",   selectedBg: "#4338ca", selectedColor: "#fff" },
  success:  { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0",   selectedBg: "#16a34a", selectedColor: "#fff" },
  warning:  { bg: "#fffbeb", color: "#92400e", border: "#fde68a",   selectedBg: "#d97706", selectedColor: "#fff" },
  error:    { bg: "#fef2f2", color: "#991b1b", border: "#fecaca",   selectedBg: "#dc2626", selectedColor: "#fff" },
};

const SIZE_STYLES: Record<ChipSize, { padding: string; fontSize: number; height: number; radius: number }> = {
  sm: { padding: "3px 10px", fontSize: 12, height: 24, radius: 6 },
  md: { padding: "5px 14px", fontSize: 13, height: 30, radius: 8 },
  lg: { padding: "7px 18px", fontSize: 14, height: 36, radius: 10 },
};

// --- Single Chip ---

export function createChip(options: ChipOptions): ChipInstance {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    dismissible: options.dismissible ?? false,
    selected: options.selected ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Chip: container not found");

  const vs = VARIANT_STYLES[opts.variant];
  const sz = SIZE_STYLES[opts.size];

  const chip = document.createElement("div");
  chip.className = `chip chip-${opts.variant} chip-${opts.size} ${opts.className}`;
  chip.style.cssText = `
    display:inline-flex;align-items:center;gap:6px;
    height:${sz.height}px;padding:${sz.padding};
    border-radius:${sz.radius}px;font-size:${sz.fontSize}px;
    font-family:-apple-system,sans-serif;font-weight:500;
    cursor:${opts.disabled ? "not-allowed" : "pointer"};
    background:${opts.selected ? vs.selectedBg : vs.bg};
    color:${opts.selected ? vs.selectedColor : vs.color};
    border:1px solid ${opts.selected ? vs.variant === "default" ? "#a5b4fc" : vs.bg : vs.border};
    transition:all 0.15s ease;user-select:none;
    white-space:nowrap;line-height:1;
    ${opts.disabled ? "opacity:0.5;" : ""}
  `;
  container.appendChild(chip);

  // Leading
  if (options.leading) {
    const lead = document.createElement("span");
    lead.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
    if (typeof options.leading === "string") {
      lead.textContent = options.leading;
      lead.style.fontSize = `${sz.fontSize + 2}px`;
    } else {
      lead.appendChild(options.leading);
    }
    chip.appendChild(lead);
  }

  // Label
  const labelEl = document.createElement("span");
  labelEl.className = "chip-label";
  labelEl.textContent = options.label;
  labelEl.style.cssText = "line-height:1;";
  chip.appendChild(labelEl);

  // Trailing
  if (options.trailing) {
    const trail = document.createElement("span");
    trail.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
    if (typeof options.trailing === "string") {
      trail.textContent = options.trailing;
    } else {
      trail.appendChild(options.trailing);
    }
    chip.appendChild(trail);
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
      padding:0 2px;color:inherit;opacity:0.6;margin-left:-2px;
      display:flex;align-items:center;border-radius:50%;
    `;
    dismissBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onDismiss?.();
      instance.destroy();
    });
    dismissBtn.addEventListener("mouseenter", () => { dismissBtn!.style.opacity = "1"; });
    dismissBtn.addEventListener("mouseleave", () => { dismissBtn!.style.opacity = "0.6"; });
    chip.appendChild(dismissBtn);
  }

  // Events
  if (!opts.disabled) {
    chip.addEventListener("click", () => {
      opts.onClick?.();
    });
    chip.addEventListener("mouseenter", () => {
      if (!opts.disabled) chip.style.opacity = "0.85";
    });
    chip.addEventListener("mouseleave", () => {
      if (!opts.disabled) chip.style.opacity = "";
    });
  }

  const instance: ChipInstance = {
    element: chip,

    getLabel() { return labelEl.textContent; },

    setLabel(text: string) { labelEl.textContent = text; },

    setSelected(selected: boolean) {
      opts.selected = selected;
      chip.style.background = selected ? vs.selectedBg : vs.bg;
      chip.style.color = selected ? vs.selectedColor : vs.color;
      chip.style.border = `1px solid ${selected ? vs.variant === "default" ? "#a5b4fc" : vs.bg : vs.border}`;
    },

    isSelected() { return opts.selected; },

    disable() {
      opts.disabled = true;
      chip.style.cursor = "not-allowed";
      chip.style.opacity = "0.5";
    },

    enable() {
      opts.disabled = false;
      chip.style.cursor = "pointer";
      chip.style.opacity = "";
    },

    destroy() { chip.remove(); },
  };

  return instance;
}

// --- Chip Group ---

export function createChipGroup(options: ChipGroupOptions): ChipGroupInstance {
  const opts = {
    mode: options.mode ?? "none",
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ChipGroup: container not found");

  let selectedValues = new Set<string>();
  let destroyed = false;

  const wrapper = document.createElement("div");
  wrapper.className = `chip-group ${opts.className}`;
  wrapper.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;font-family:-apple-system,sans-serif;";
  container.appendChild(wrapper);

  function render(): void {
    wrapper.innerHTML = "";

    for (const chipData of options.chips) {
      const isSelected = selectedValues.has(chipData.value);

      const chipEl = createChip({
        container: document.createElement("div"), // temp container
        label: chipData.label,
        variant: opts.variant,
        size: opts.size,
        selected: isSelected,
        disabled: chipData.disabled,
        leading: chipData.leading,
        onClick: () => {
          if (chipData.disabled || destroyed) return;
          if (opts.mode === "single") {
            selectedValues.clear();
            selectedValues.add(chipData.value);
          } else if (opts.mode === "multiple") {
            if (selectedValues.has(chipData.value)) {
              selectedValues.delete(chipData.value);
            } else {
              selectedValues.add(chipData.value);
            }
          }
          render();
          opts.onChange?.(Array.from(selectedValues));
        },
      });

      // Move chip from temp div into wrapper
      wrapper.appendChild(chipEl.element);
    }
  }

  render();

  const instance: ChipGroupInstance = {
    element: wrapper,

    getValues() { return Array.from(selectedValues); },

    setValues(values: string[]) {
      selectedValues = new Set(values);
      render();
    },

    getSelectedChips() { return Array.from(selectedValues); },

    addChip(label: string, value: string) {
      options.chips.push({ label, value });
      render();
    },

    removeChip(value: string) {
      options.chips = options.chips.filter((c) => c.value !== value);
      selectedValues.delete(value);
      render();
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
    },
  };

  return instance;
}

/** Shade a hex color by a percentage (-100 to 100) */
export function shadeColor(hex: string, percent: number): string {
  const c = parseHex(hex);
  if (!c) return hex;
  const amt = Math.round(2.55 * percent);
  const r = clampByte(c.r + amt);
  const g = clampByte(c.g + amt);
  const b = clampByte(c.b + amt);
  return rgbToHex(r, g, b);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function clampByte(v: number): number { return Math.max(0, Math.min(255, v)); }
