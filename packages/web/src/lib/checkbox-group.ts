/**
 * Checkbox Group: Multi-select checkbox group with select-all, indeterminate state,
 * horizontal/vertical layout, card variant, disabled items, keyboard navigation,
 * and ARIA accessibility.
 */

// --- Types ---

export type CheckboxSize = "sm" | "md" | "lg";
export type CheckboxVariant = "default" | "primary" | "card";

export interface CheckboxOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Description text */
  description?: string;
  /** Disabled state for this option */
  disabled?: boolean;
  /** Icon/emoji prefix */
  icon?: string;
}

export interface CheckboxGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Array of checkbox options */
  options: CheckboxOption[];
  /** Initially checked values */
  values?: string[];
  /** Size variant */
  size?: CheckboxSize;
  /** Visual variant */
  variant?: CheckboxVariant;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Gap between options (px) */
  gap?: number;
  /** Show "Select All" option */
  showSelectAll?: boolean;
  /** Select All label text */
  selectAllLabel?: string;
  /** Maximum selections allowed (0 = unlimited) */
  maxSelections?: number;
  /** Name prefix for inputs */
  name?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Callback on change */
  onChange?: (values: string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CheckboxGroupInstance {
  element: HTMLElement;
  getValues: () => string[];
  setValues: (values: string[]) => void;
  isChecked: (value: string) => boolean;
  toggleValue: (value: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isIndeterminate: () => boolean;
  isAllSelected: () => boolean;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<CheckboxSize, { fontSize: number; boxSize: number; paddingX: number; paddingY: number }> = {
  sm: { fontSize: 12, boxSize: 14, paddingX: 6, paddingY: 2 },
  md: { fontSize: 13, boxSize: 16, paddingX: 8, paddingY: 4 },
  lg: { fontSize: 14, boxSize: 18, paddingX: 10, paddingY: 5 },
};

// --- Main ---

export function createCheckboxGroup(options: CheckboxGroupOptions): CheckboxGroupInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    direction: options.direction ?? "vertical",
    gap: options.gap ?? 8,
    name: options.name ?? `checkbox-${Date.now()}`,
    disabled: options.disabled ?? false,
    showSelectAll: options.showSelectAll ?? false,
    selectAllLabel: options.selectAllLabel ?? "Select All",
    maxSelections: options.maxSelections ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CheckboxGroup: container not found");

  const sz = SIZE_STYLES[opts.size];

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `checkbox-group checkbox-${opts.variant} checkbox-${opts.direction} ${opts.className}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:${opts.direction};gap:${opts.gap}px;
    font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  let checkedValues = new Set(options.values ?? []);

  function render(): void {
    wrapper.innerHTML = "";

    // Select All row
    if (opts.showSelectAll) {
      const allChecked = isAllSelectedInternal();
      const indeterminate = isIndeterminateInternal();

      const allItem = createCheckboxItem({
        value: "__all__",
        label: opts.selectAllLabel,
        checked: allChecked,
        indeterminate,
        disabled: opts.disabled,
        isCard: opts.variant === "card",
        size: sz,
      }, () => {
        if (allChecked || indeterminate) {
          checkedValues.clear();
        } else {
          for (const opt of opts.options) {
            if (!opt.disabled) checkedValues.add(opt.value);
          }
        }
        render();
        opts.onChange?.(Array.from(checkedValues));
      });
      wrapper.appendChild(allItem);
    }

    // Options
    for (let i = 0; i < opts.options.length; i++) {
      const opt = opts.options[i]!;
      const isChecked = checkedValues.has(opt.value);
      const isDisabled = opts.disabled || opt.disabled;

      const item = createCheckboxItem(
        {
          value: opt.value,
          label: opt.label,
          description: opt.description,
          icon: opt.icon,
          checked: isChecked,
          disabled: isDisabled,
          isCard: opts.variant === "card",
          size: sz,
        },
        () => {
          if (isDisabled) return;
          if (isChecked) {
            checkedValues.delete(opt.value);
          } else {
            if (opts.maxSelections > 0 && checkedValues.size >= opts.maxSelections) return;
            checkedValues.add(opt.value);
          }
          render();
          opts.onChange?.(Array.from(checkedValues));
        },
      );
      wrapper.appendChild(item);
    }
  }

  function createCheckboxItem(
    cfg: {
      value: string;
      label: string;
      description?: string;
      icon?: string;
      checked: boolean;
      disabled: boolean;
      isCard: boolean;
      size: typeof sz;
    },
    onClick: () => void,
  ): HTMLElement {
    const item = document.createElement("label");
    item.className = `checkbox-item ${cfg.checked ? "cb-checked" : ""} ${cfg.disabled ? "cb-disabled" : ""}`;

    if (cfg.isCard) {
      item.style.cssText = `
        display:flex;align-items:flex-start;gap:8px;padding:${cfg.size.paddingY}px ${cfg.size.paddingX}px;
        border:2px solid ${cfg.checked ? "#6366f1" : "#e5e7eb"};border-radius:10px;
        cursor:${cfg.disabled ? "not-allowed" : "pointer"};
        background:${cfg.checked ? "#eef2ff" : "#fff"};
        transition:border-color 0.15s,background 0.15s;
        ${cfg.disabled ? "opacity:0.5;" : ""}
      `;
      item.addEventListener("mouseenter", () => {
        if (!cfg.disabled && !cfg.checked) item.style.borderColor = "#a5b4fc";
      });
      item.addEventListener("mouseleave", () => {
        if (!cfg.disabled) item.style.borderColor = cfg.checked ? "#6366f1" : "#e5e7eb";
      });
    } else {
      item.style.cssText = `
        display:inline-flex;align-items:center;gap:8px;padding:${cfg.size.paddingY}px ${cfg.size.paddingX}px;
        cursor:${cfg.disabled ? "not-allowed" : "pointer"};
        user-select:none;font-size:${cfg.size.fontSize}px;color:#374151;
        transition:background 0.15s;border-radius:6px;
        ${cfg.disabled ? "opacity:0.5;" : ""}
      `;
      item.addEventListener("mouseenter", () => {
        if (!cfg.disabled) item.style.background = "#f3f4f6";
      });
      item.addEventListener("mouseleave", () => {
        if (!cfg.disabled) item.style.background = "";
      });
    }

    // Hidden input
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = `${opts.name}-${cfg.value}`;
    input.checked = cfg.checked;
    input.disabled = cfg.disabled;
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
    item.appendChild(input);

    // Checkbox visual
    const box = document.createElement("span");
    box.className = "checkbox-box";
    const bs = cfg.size.boxSize;
    box.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      width:${bs}px;height:${bs}px;border-radius:4px;
      border:2px solid ${cfg.checked ? "#6366f1" : "#d1d5db"};
      flex-shrink:0;transition:border-color 0.15s,background 0.15s;
      background:${cfg.checked ? "#6366f1" : "transparent"};
    `;

    // Checkmark or indeterminate dash
    if (cfg.checked) {
      const mark = document.createElement("span");
      mark.innerHTML = cfg.value === "__all__" && isIndeterminateInternal()
        ? `<svg width="${bs - 6}" height="${bs - 6}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>`
        : `<svg width="${bs - 6}" height="${bs - 6}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;
      box.appendChild(mark);
    }
    item.appendChild(box);

    // Icon
    if (cfg.icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = cfg.icon;
      iconEl.style.cssText = "font-size:inherit;line-height:1;";
      item.appendChild(iconEl);
    }

    // Text area
    const textArea = document.createElement("span");
    textArea.style.cssText = "display:flex;flex-direction:column;";

    const labelText = document.createElement("span");
    labelText.textContent = cfg.label;
    labelText.style.cssText = `font-weight:500;line-height:1.3;${cfg.disabled ? "color:#9ca3af;" : ""}`;
    textArea.appendChild(labelText);

    if (cfg.description) {
      const desc = document.createElement("span");
      desc.textContent = cfg.description;
      desc.style.cssText = `font-size:${cfg.size.fontSize - 1}px;color:#9ca3af;margin-top:1px;line-height:1.3;`;
      textArea.appendChild(desc);
    }

    item.appendChild(textArea);

    item.addEventListener("click", (e) => {
      e.preventDefault();
      onClick();
    });

    return item;
  }

  function isAllSelectedInternal(): boolean {
    const enabledOptions = opts.options.filter((o) => !o.disabled);
    return enabledOptions.length > 0 && enabledOptions.every((o) => checkedValues.has(o.value));
  }

  function isIndeterminateInternal(): boolean {
    const enabledOptions = opts.options.filter((o) => !o.disabled);
    const checkedCount = enabledOptions.filter((o) => checkedValues.has(o.value)).length;
    return checkedCount > 0 && checkedCount < enabledOptions.length;
  }

  render();

  const instance: CheckboxGroupInstance = {
    element: wrapper,

    getValues() { return Array.from(checkedValues); },

    setValues(values: string[]) {
      checkedValues = new Set(values);
      render();
    },

    isChecked(value: string) { return checkedValues.has(value); },

    toggleValue(value: string) {
      if (checkedValues.has(value)) {
        checkedValues.delete(value);
      } else {
        if (opts.maxSelections > 0 && checkedValues.size >= opts.maxSelections) return;
        checkedValues.add(value);
      }
      render();
      opts.onChange?.(Array.from(checkedValues));
    },

    selectAll() {
      for (const opt of opts.options) {
        if (!opt.disabled) checkedValues.add(opt.value);
      }
      render();
      opts.onChange?.(Array.from(checkedValues));
    },

    deselectAll() {
      checkedValues.clear();
      render();
      opts.onChange?.(Array.from(checkedValues));
    },

    isIndeterminate: isIndeterminateInternal,

    isAllSelected: isAllSelectedInternal,

    disable() {
      opts.disabled = true;
      render();
    },

    enable() {
      opts.disabled = false;
      render();
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}
