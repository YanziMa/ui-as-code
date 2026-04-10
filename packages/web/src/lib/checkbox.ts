/**
 * Checkbox & Radio: Styled checkbox and radio button components with
 * custom icons, indeterminate state, sizes, variants, label positioning,
 * group behavior, disabled state, animations, and ARIA support.
 */

// --- Types ---

export type CheckboxSize = "sm" | "md" | "lg";
export type CheckboxVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface CheckboxOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial checked state */
  checked?: boolean;
  /** Indeterminate state (overrides checked visually) */
  indeterminate?: boolean;
  /** Size variant */
  size?: CheckboxSize;
  /** Color variant */
  variant?: CheckboxVariant;
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom check icon (SVG string) */
  customIcon?: string;
  /** Label position */
  labelPosition?: "right" | "left";
  /** Callback on change */
  onChange?: (checked: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RadioOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Name for radio group */
  name: string;
  /** Value of this radio */
  value: string;
  /** Initial checked? */
  checked?: boolean;
  /** Label text */
  label?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Size */
  size?: CheckboxSize;
  /** Callback on change */
  onChange?: (value: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CheckboxInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => boolean;
  setValue: (checked: boolean) => void;
  setIndeterminate: (state: boolean) => void;
  toggle: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface RadioInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => boolean;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<CheckboxSize, { box: number; fontSize: number; iconSize: number }> = {
  sm: { box: 16, fontSize: 12, iconSize: 10 },
  md: { box: 18, fontSize: 13, iconSize: 12 },
  lg: { box: 20, fontSize: 14, iconSize: 14 },
};

const VARIANT_COLORS: Record<CheckboxVariant, { active: string; border: string; bg: string; hoverBg: string }> = {
  default:  { active: "#374151", border: "#d1d5db", bg: "#fff", hoverBg: "#f9fafb" },
  primary:  { active: "#4338ca", border: "#a5b4fc", bg: "#eef2ff", hoverBg: "#e0e7ff" },
  success:  { active: "#16a34a", border: "#86efac", bg: "#f0fdf4", hoverBg: "#dcfce7" },
  warning:  { active: "#d97706", border: "#fcd34d", bg: "#fffbeb", hoverBg: "#fef3c7" },
  danger:   { active: "#dc2626", border: "#fca5a5", bg: "#fef2f2", hoverBg: "#fee2e2" },
};

const CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 3 5-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const INDETERMINATE_ICON = `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="4" width="8" height="2" rx="1" fill="currentColor"/></svg>`;

// --- Checkbox ---

export function createCheckbox(options: CheckboxOptions): CheckboxInstance {
  const opts = {
    checked: options.checked ?? false,
    indeterminate: options.indeterminate ?? false,
    size: options.size ?? "md",
    variant: options.variant ?? "primary",
    disabled: options.disabled ?? false,
    labelPosition: options.labelPosition ?? "right",
    customIcon: options.customIcon,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Checkbox: container not found");

  const sz = SIZE_MAP[opts.size];
  const colors = VARIANT_COLORS[opts.variant];

  // Wrapper (label)
  const wrapper = document.createElement("label");
  wrapper.className = `checkbox-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:flex-start;gap:${sz.box * 0.45}px;
    cursor:${opts.disabled ? "not-allowed" : "pointer"};
    user-select:none;font-family:-apple-system,sans-serif;
    font-size:${sz.fontSize}px;color:#374151;line-height:${sz.box}px;
    position:relative;
  `;

  // Hidden input
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "checkbox-input";
  input.checked = opts.checked;
  input.disabled = opts.disabled;
  if (opts.indeterminate) input.indeterminate = true;
  input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
  wrapper.appendChild(input);

  // Visual box
  const box = document.createElement("div");
  box.className = "checkbox-box";
  box.style.cssText = `
    flex-shrink:0;width:${sz.box}px;height:${sz.box}px;
    border-radius:4px;border:2px solid ${colors.border};
    background:${colors.bg};display:flex;align-items:center;
    justify-content:center;transition:all 0.15s ease;
  `;
  wrapper.appendChild(box);

  // Icon inside box
  updateBoxVisual();

  // Label area
  if (opts.label || opts.description) {
    const labelArea = document.createElement("span");
    labelArea.style.cssText = "display:flex;flex-direction:column;";

    if (opts.label) {
      const labelText = document.createElement("span");
      labelText.style.cssText = `${opts.disabled ? "color:#9ca3af;" : ""}font-weight:400;`;
      labelText.textContent = opts.label;
      labelArea.appendChild(labelText);
    }

    if (opts.description) {
      const desc = document.createElement("span");
      desc.style.cssText = `font-size:${sz.fontSize - 1}px;color:#9ca3af;margin-top:1px;`;
      desc.textContent = opts.description;
      labelArea.appendChild(desc);
    }

    if (opts.labelPosition === "left") {
      wrapper.insertBefore(labelArea, box);
    } else {
      wrapper.appendChild(labelArea);
    }
  }

  container.appendChild(wrapper);

  // Hover effects
  wrapper.addEventListener("mouseenter", () => {
    if (!opts.disabled && !input.checked && !input.indeterminate) {
      box.style.background = colors.hoverBg;
      box.style.borderColor = colors.active + "60";
    }
  });
  wrapper.addEventListener("mouseleave", () => {
    if (!input.checked && !input.indeterminate) {
      box.style.background = colors.bg;
      box.style.borderColor = colors.border;
    }
  });

  // Click handler
  wrapper.addEventListener("click", () => {
    if (opts.disabled) return;
    input.checked = !input.checked;
    input.indeterminate = false;
    updateBoxVisual();
    opts.onChange?.(input.checked);
  });

  function updateBoxVisual(): void {
    if (input.indeterminate) {
      box.style.background = colors.active;
      box.style.borderColor = colors.active;
      box.innerHTML = INDETERMINATE_ICON;
      box.style.color = "#fff";
    } else if (input.checked) {
      box.style.background = colors.active;
      box.style.borderColor = colors.active;
      box.innerHTML = opts.customIcon ?? CHECK_ICON;
      box.style.color = "#fff";
    } else {
      box.style.background = colors.bg;
      box.style.borderColor = colors.border;
      box.innerHTML = "";
    }
  }

  // Focus ring
  input.addEventListener("focus", () => {
    box.style.boxShadow = `0 0 0 3px ${colors.active}30`;
  });
  input.addEventListener("blur", () => {
    box.style.boxShadow = "";
  });

  const instance: CheckboxInstance = {
    element: wrapper,
    inputEl: input,

    getValue() { return input.checked; },

    setValue(checked: boolean) {
      input.checked = checked;
      input.indeterminate = false;
      updateBoxVisual();
    },

    setIndeterminate(state: boolean) {
      input.indeterminate = state;
      updateBoxVisual();
    },

    toggle() {
      if (!opts.disabled) {
        input.checked = !input.checked;
        input.indeterminate = false;
        updateBoxVisual();
        opts.onChange?.(input.checked);
      }
    },

    disable() {
      opts.disabled = true;
      input.disabled = true;
      wrapper.style.cursor = "not-allowed";
      wrapper.style.opacity = "0.6";
    },

    enable() {
      opts.disabled = false;
      input.disabled = false;
      wrapper.style.cursor = "";
      wrapper.style.opacity = "";
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}

// --- Radio ---

export function createRadio(options: RadioOptions): RadioInstance {
  const sz = SIZE_MAP[options.size ?? "md"];
  const colors = VARIANT_COLORS.primary;

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Radio: container not found");

  const wrapper = document.createElement("label");
  wrapper.className = `radio-wrapper ${options.className ?? ""}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;gap:8px;
    cursor:${options.disabled ? "not-allowed" : "pointer"};
    user-select:none;font-family:-apple-system,sans-serif;
    font-size:${sz.fontSize}px;color:#374151;
  `;

  const input = document.createElement("input");
  input.type = "radio";
  input.name = options.name;
  input.value = options.value;
  input.checked = options.checked ?? false;
  input.disabled = options.disabled ?? false;
  input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
  wrapper.appendChild(input);

  // Circle visual
  const circle = document.createElement("div");
  circle.className = "radio-circle";
  circle.style.cssText = `
    flex-shrink:0;width:${sz.box}px;height:${sz.box}px;
    border-radius:50%;border:2px solid ${colors.border};
    background:${colors.bg};transition:all 0.15s ease;
    display:flex;align-items:center;justify-content:center;
  `;

  // Inner dot
  const dot = document.createElement("span");
  dot.style.cssText = `
    width:${sz.box * 0.42}px;height:${sz.box * 0.42}px;
    border-radius:50%;background:${colors.active};
    transform:scale(${input.checked ? 1 : 0});
    transition:transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  circle.appendChild(dot);
  wrapper.appendChild(circle);

  // Label
  if (options.label) {
    const label = document.createElement("span");
    label.textContent = options.label;
    label.style.cssText = options.disabled ? "color:#9ca3af;" : "";
    wrapper.appendChild(label);
  }

  container.appendChild(wrapper);

  // Interactions
  wrapper.addEventListener("mouseenter", () => {
    if (!options.disabled && !input.checked) {
      circle.style.borderColor = colors.active + "80";
    }
  });
  wrapper.addEventListener("mouseleave", () => {
    if (!input.checked) circle.style.borderColor = colors.border;
  });

  input.addEventListener("change", () => {
    dot.style.transform = input.checked ? "scale(1)" : "scale(0)";
    if (input.checked) {
      circle.style.background = colors.hoverBg;
      circle.style.borderColor = colors.active;
    } else {
      circle.style.background = colors.bg;
      circle.style.borderColor = colors.border;
    }
    options.onChange?.(options.value);
  });

  input.addEventListener("focus", () => {
    circle.style.boxShadow = `0 0 0 3px ${colors.active}30`;
  });
  input.addEventListener("blur", () => {
    circle.style.boxShadow = "";
  });

  return {
    element: wrapper,
    inputEl: input,
    getValue() { return input.checked; },
    destroy() { wrapper.remove(); },
  };
}

// --- Checkbox Group ---

export interface CheckboxGroupOptions {
  container: HTMLElement | string;
  items: Array<{ value: string; label: string; checked?: boolean; disabled?: boolean }>;
  orientation?: "horizontal" | "vertical";
  gap?: number;
  onChange?: (values: string[]) => void;
}

export interface CheckboxGroupInstance {
  element: HTMLElement;
  getValues: () => string[];
  setValues: (values: string[]) => void;
  destroy: () => void;
}

export function createCheckboxGroup(options: CheckboxGroupOptions): CheckboxGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CheckboxGroup: container not found");

  const wrapper = document.createElement("div");
  wrapper.className = "checkbox-group";
  wrapper.style.cssText = `
    display:flex;${options.orientation === "vertical" ? "flex-direction:column;" : "flex-direction:row;flex-wrap:wrap;"}
    gap:${(options.gap ?? 12)}px;
  `;
  container.appendChild(wrapper);

  const instances: CheckboxInstance[] = [];

  for (const item of options.items) {
    const itemContainer = document.createElement("div");
    wrapper.appendChild(itemContainer);

    const inst = createCheckbox({
      container: itemContainer,
      checked: item.checked,
      disabled: item.disabled,
      label: item.label,
      onChange() {
        options.onChange?.(group.getValues());
      },
    });
    instances.push(inst);
  }

  const group: CheckboxGroupInstance = {
    element: wrapper,

    getValues() {
      return instances.filter((i) => i.getValue()).map((i) =>
        i.inputEl.dataset.value ?? ""
      );
    },

    setValues(values: string[]) {
      for (const inst of instances) {
        const val = inst.inputEl.dataset.value ?? "";
        inst.setValue(values.includes(val));
      }
    },

    destroy() {
      for (const inst of instances) inst.destroy();
      wrapper.remove();
    },
  };

  // Store values on inputs for retrieval
  for (let i = 0; i < instances.length; i++) {
    instances[i]!.inputEl.dataset.value = options.items[i]!.value;
  }

  return group;
}
