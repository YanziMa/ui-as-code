/**
 * Radio Button Group: Radio button group component with horizontal/vertical
 * orientation, sizes, variants, disabled state, keyboard navigation,
 * ARIA support, and controlled/uncontrolled modes.
 */

// --- Types ---

export type RadioSize = "sm" | "md" | "lg";
export type RadioVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface RadioOption {
  /** Unique value */
  value: string;
  /** Label text */
  label: string;
  /** Disabled? */
  disabled?: boolean;
  /** Description text below label */
  description?: string;
  /** Custom icon/emoji */
  icon?: string;
}

export interface RadioGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Radio options */
  options: RadioOption[];
  /** Group name (for form submission) */
  name: string;
  /** Initially selected value */
  value?: string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Size variant */
  size?: RadioSize;
  /** Color variant */
  variant?: RadioVariant;
  /** Disabled (entire group) */
  disabled?: boolean;
  /** Show descriptions under each option */
  showDescriptions?: boolean;
  /** Gap between options (px) */
  gap?: number;
  /** Callback on change */
  onChange?: (value: string, option: RadioOption) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RadioGroupInstance {
  /** Root DOM element */
  element: HTMLElement;
  /** Get current selected value */
  getValue: () => string;
  /** Set selected value programmatically */
  setValue: (value: string) => void;
  /** Get current option */
  getSelectedOption: () => RadioOption | undefined;
  /** Enable/disable entire group */
  setDisabled: (disabled: boolean) => void;
  /** Add option dynamically */
  addOption: (option: RadioOption) => void;
  /** Remove option by value */
  removeOption: (value: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<RadioSize, { circle: number; fontSize: number; dot: number; gap: number }> = {
  sm: { circle: 16, fontSize: 12, dot: 6, gap: 12 },
  md: { circle: 18, fontSize: 13, dot: 7, gap: 16 },
  lg: { circle: 20, fontSize: 14, dot: 8, gap: 20 },
};

const VARIANT_COLORS: Record<RadioVariant, { active: string; border: string; bg: string; hoverBorder: string }> = {
  default:  { active: "#374151", border: "#d1d5db", bg: "#fff", hoverBorder: "#9ca3af" },
  primary:  { active: "#4338ca", border: "#a5b4fc", bg: "#eef2ff", hoverBorder: "#818cf8" },
  success:  { active: "#16a34a", border: "#86efac", bg: "#f0fdf4", hoverBorder: "#4ade80" },
  warning:  { active: "#d97706", border: "#fcd34d", bg: "#fffbeb", hoverBorder: "#fbbf24" },
  danger:   { active: "#dc2626", border: "#fca5a5", bg: "#fef2f2", hoverBorder: "#f87171" },
};

// --- Main Class ---

export class RadioGroupManager {
  create(options: RadioGroupOptions): RadioGroupInstance {
    const opts = {
      name: options.name,
      value: options.value ?? "",
      orientation: options.orientation ?? "horizontal",
      size: options.size ?? "md",
      variant: options.variant ?? "primary",
      disabled: options.disabled ?? false,
      showDescriptions: options.showDescriptions ?? true,
      gap: options.gap ?? SIZE_MAP[options.size ?? "md"].gap,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("RadioGroup: container not found");

    const sz = SIZE_MAP[opts.size];
    const colors = VARIANT_COLORS[opts.variant];

    let currentValue = opts.value;
    let destroyed = false;

    // Root
    const root = document.createElement("div");
    root.className = `radio-group radio-group-${opts.orientation} ${opts.className ?? ""}`;
    root.setAttribute("role", "radiogroup");
    root.style.cssText = `
      display:flex;${opts.orientation === "vertical" ? "flex-direction:column;" : "flex-direction:row;flex-wrap:wrap;"}
      gap:${opts.gap}px;font-family:-apple-system,sans-serif;
    `;
    container.appendChild(root);

    // Build options
    function build(): void {
      root.innerHTML = "";

      for (let i = 0; i < options.options.length; i++) {
        const opt = options.options[i]!;
        const isSelected = opt.value === currentValue;

        const itemEl = document.createElement("label");
        itemEl.className = "radio-item";
        itemEl.setAttribute("role", "radio");
        itemEl.setAttribute("aria-checked", String(isSelected));
        itemEl.dataset.value = opt.value;
        itemEl.style.cssText = `
          display:inline-flex;align-items:flex-start;gap:${sz.circle * 0.4}px;
          cursor:${(opts.disabled || opt.disabled) ? "not-allowed" : "pointer"};
          user-select:none;font-size:${sz.fontSize}px;color:#374151;
          position:relative;padding:2px 0;
          opacity:${opt.disabled ? "0.5" : "1"};
        `;

        // Hidden input
        const input = document.createElement("input");
        input.type = "radio";
        input.name = opts.name;
        input.value = opt.value;
        input.checked = isSelected;
        input.disabled = opts.disabled || opt.disabled;
        input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
        itemEl.appendChild(input);

        // Circle visual
        const circle = document.createElement("div");
        circle.className = "radio-circle";
        circle.style.cssText = `
          flex-shrink:0;width:${sz.circle}px;height:${sz.circle}px;
          border-radius:50%;border:2px solid ${isSelected ? colors.active : colors.border};
          background:${isSelected ? colors.hoverBg : colors.bg};
          transition:all 0.18s ease;display:flex;align-items:center;justify-content:center;
        `;

        // Inner dot
        const dot = document.createElement("span");
        dot.className = "radio-dot";
        dot.style.cssText = `
          width:${sz.dot}px;height:${sz.dot}px;border-radius:50%;
          background:${colors.active};
          transform:scale(${isSelected ? 1 : 0});
          transition:transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        circle.appendChild(dot);
        itemEl.appendChild(circle);

        // Label area
        const labelArea = document.createElement("span");
        labelArea.style.cssText = "display:flex;flex-direction:column;line-height:1.4;";

        // Icon
        if (opt.icon) {
          const iconEl = document.createElement("span");
          iconEl.textContent = opt.icon;
          iconEl.style.cssText = `font-size:${sz.fontSize + 3}px;margin-right:2px;`;
          labelArea.appendChild(iconEl);
        }

        // Label text
        const labelText = document.createElement("span");
        labelText.textContent = opt.label;
        labelText.style.fontWeight = isSelected ? "600" : "400";
        if (opt.disabled || opts.disabled) labelText.style.color = "#9ca3af";
        labelArea.appendChild(labelText);

        // Description
        if (opt.description && opts.showDescriptions) {
          const desc = document.createElement("span");
          desc.textContent = opt.description;
          desc.style.cssText = `font-size:${Math.max(sz.fontSize - 2, 10)}px;color:#9ca3af;margin-top:1px;`;
          labelArea.appendChild(desc);
        }

        itemEl.appendChild(labelArea);
        root.appendChild(itemEl);

        // Events
        itemEl.addEventListener("click", () => {
          if (opts.disabled || opt.disabled) return;
          select(opt.value);
        });

        itemEl.addEventListener("mouseenter", () => {
          if (!(opts.disabled || opt.disabled) && !isSelected) {
            circle.style.borderColor = colors.hoverBorder;
          }
        });
        itemEl.addEventListener("mouseleave", () => {
          if (!isSelected) {
            circle.style.borderColor = colors.border;
            circle.style.background = colors.bg;
          }
        });

        // Focus ring
        input.addEventListener("focus", () => {
          circle.style.boxShadow = `0 0 0 3px ${colors.active}30`;
        });
        input.addEventListener("blur", () => {
          circle.style.boxShadow = "";
        });
      }
    }

    function select(value: string): void {
      if (value === currentValue) return;
      currentValue = value;
      build();
      const opt = options.options.find((o) => o.value === value);
      opts.onChange?.(value, opt!);
    }

    // Keyboard navigation
    root.addEventListener("keydown", (e: KeyboardEvent) => {
      const enabledOptions = options.options.filter((o) => !o.disabled);
      const idx = enabledOptions.findIndex((o) => o.value === currentValue);

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          if (opts.orientation === "vertical" && e.key === "ArrowRight") break;
          if (opts.orientation === "horizontal" && e.key === "ArrowDown") break;
          if (idx < enabledOptions.length - 1) select(enabledOptions[idx + 1]!.value);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          if (opts.orientation === "vertical" && e.key === "ArrowLeft") break;
          if (opts.orientation === "horizontal" && e.key === "ArrowUp") break;
          if (idx > 0) select(enabledOptions[idx - 1]!.value);
          break;
        case "Home":
          e.preventDefault();
          if (enabledOptions[0]) select(enabledOptions[0].value);
          break;
        case "End":
          e.preventDefault();
          if (enabledOptions.length > 0) select(enabledOptions[enabledOptions.length - 1]!.value);
          break;
      }
    });

    // Initial render
    build();

    const instance: RadioGroupInstance = {
      element: root,

      getValue() { return currentValue; },

      setValue(value: string) {
        if (options.options.some((o) => o.value === value)) {
          select(value);
        }
      },

      getSelectedOption() {
        return options.options.find((o) => o.value === currentValue);
      },

      setDisabled(disabled: boolean) {
        opts.disabled = disabled;
        build();
      },

      addOption(newOpt: RadioOption) {
        options.options.push(newOpt);
        build();
      },

      removeOption(value: string) {
        options.options = options.options.filter((o) => o.value !== value);
        if (currentValue === value) {
          currentValue = options.options[0]?.value ?? "";
        }
        build();
      },

      destroy() {
        destroyed = true;
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a radio group */
export function createRadioGroup(options: RadioGroupOptions): RadioGroupInstance {
  return new RadioGroupManager().create(options);
}
