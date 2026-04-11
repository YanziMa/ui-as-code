/**
 * Radio Utilities: Radio button group, card-style radio options,
 * horizontal/vertical layouts, disabled states, ARIA radiogroup,
 * and validation integration.
 */

// --- Types ---

export type RadioSize = "sm" | "md" | "lg";
export type RadioVariant = "default" | "filled" | "outlined" | "card" | "button";

export interface RadioOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Description text (for card variant) */
  description?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Icon (HTML string) */
  icon?: string;
  /** Prefix badge text */
  prefix?: string;
}

export interface RadioGroupOptions {
  /** Group name (for form submission) */
  name?: string;
  /** Group label */
  label?: string;
  /** Options to render as radio buttons */
  options: RadioOption[];
  /** Selected value */
  value?: string;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Size variant */
  size?: RadioSize;
  /** Visual variant */
  variant?: RadioVariant;
  /** Disabled? */
  disabled?: boolean;
  /** Required? */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** On change callback */
  onChange?: (value: string, option: RadioOption) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface RadioInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get current selected value */
  getValue(): string;
  /** Set selected value programmatically */
  setValue(value: string): void;
  /** Get the selected option object */
  getSelected(): RadioOption | undefined;
  /** Clear selection */
  clear(): void;
  /** Set disabled state for entire group */
  setDisabled(disabled: boolean): void;
  /** Enable/disable a specific option */
  setOptionDisabled(value: string, disabled: boolean): void;
  /** Set error state */
  setError(message?: string): void;
  /** Clear error state */
  clearError(): void;
  /** Focus the group */
  focus(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const RADIO_SIZES: Record<RadioSize, { size: string; fontSize: string; gap: string; padding: string }> = {
  "sm": { size: "14px", fontSize: "12px", gap: "6px", padding: "4px 8px" },
  "md": { size:18px", fontSize: "14px", gap: "8px", padding: "6px 12px" },
  "lg": { size: "22px", fontSize: "15px", gap: "10px", padding: "8px 16px" },
};

// --- Core Factory ---

/**
 * Create a radio button group.
 *
 * @example
 * ```ts
 * const radio = createRadioGroup({
 *   name: "plan",
 *   label: "Choose a plan",
 *   options: [
 *     { value: "free", label: "Free", description: "Basic features" },
 *     { value: "pro", label: "Pro", description: "Advanced features" },
 *   ],
 *   value: "free",
 *   onChange: (val) => console.log(val),
 * });
 * ```
 */
export function createRadioGroup(options: RadioGroupOptions): RadioInstance {
  const {
    name,
    label,
    options,
    value: initialValue,
    direction = "vertical",
    size = "md",
    variant = "default",
    disabled = false,
    required = false,
    error,
    helperText,
    onChange,
    className,
    container,
  } = options;

  let _selected = initialValue ?? "";
  let _error = error ?? "";

  const sc = RADIO_SIZES[size];
  const inputEls = new Map<string, HTMLInputElement>();

  // Root
  const root = document.createElement("fieldset");
  root.className = `radio-group ${variant} ${size} ${className ?? ""}`.trim();
  root.setAttribute("role", "radiogroup");
  root.style.cssText =
    "border:none;padding:0;margin:0;display:flex;flex-direction:" + direction + ";" +
    `gap:${variant === "button" ? "4px" : "10px"};` +
    (direction === "horizontal" ? "flex-wrap:wrap;" : "");

  // Group label
  if (label) {
    const legend = document.createElement("legend");
    legend.textContent = label;
    legend.style.cssText =
      `font-size:${sc.fontSize};font-weight:600;color:#374151;padding-bottom:6px;`;
    if (required) {
      const reqMark = document.createElement("span");
      reqMark.textContent = "*";
      reqMark.style.color = "#ef4444";
      legend.appendChild(reqMark);
    }
    root.prepend(legend);
  }

  // Render each option
  options.forEach((opt, idx) => {
    const isSelected = _selected === opt.value;
    const itemEl = createRadioItem(opt, isSelected, idx === 0);
    inputEls.set(opt.value, itemEl.input);
    root.appendChild(itemEl.el);
  });

  // Error / helper below group
  let footerEl: HTMLElement | null = null;

  if (_error || helperText) {
    footerEl = document.createElement("div");
    footerEl.className = "radio-footer";
    footerEl.style.cssText = `font-size:11px;color:${_error ? "#dc2626" : "#9ca3af"};margin-top:4px;`;
    footerEl.textContent = _error || helperText || "";
    root.appendChild(footerEl);
  }

  // --- Create Radio Item ---

  function createRadioItem(opt: RadioOption, isSelected: boolean, isFirst: boolean): { el: HTMLElement; input: HTMLInputElement } {
    if (variant === "card") return createCardItem(opt, isSelected);
    if (variant === "button") return createButtonItem(opt, isSelected);
    return createDefaultItem(opt, isSelected, isFirst);
  }

  function createDefaultItem(opt: RadioOption, isSelected: boolean, isFirst: boolean): { el: HTMLElement; input: HTMLInputElement } {
    const wrapper = document.createElement("label");
    wrapper.className = "radio-item";
    wrapper.style.cssText =
      "display:inline-flex;align-items:center;gap:" + sc.gap + ";" +
      "cursor:" + (opt.disabled || disabled ? "not-allowed" : "pointer") + ";" +
      "user-select:none;" + (opt.disabled || disabled ? "opacity:0.5;" : "");

    // Native input
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name ?? `radio-${Math.random().toString(36).slice(2)}`;
    input.value = opt.value;
    input.checked = isSelected;
    input.disabled = opt.disabled || disabled;
    if (required && isFirst) input.required = true;
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
    if (isSelected) input.setAttribute("aria-checked", "true");

    // Visual circle
    const visual = document.createElement("span");
    visual.className = "radio-visual";
    visual.style.cssText =
      `display:flex;align-items:center;justify-content:center;width:${sc.size};height:${sc.size};` +
      "flex-shrink:0;border-radius:50%;border:2px solid #d1d5db;background:#fff;" +
      "transition:all 0.15s ease;position:relative;top:1px;";

    const dot = document.createElement("span");
    dot.className = "radio-dot";
    dot.style.cssText =
      `width:${parseInt(sc.size) - 8}px;height:${parseInt(sc.size) - 8}px;border-radius:50%;` +
      "background:#3b82f6;transform:scale(0);transition:transform 0.12s ease;";
    visual.appendChild(dot);

    wrapper.appendChild(input);
    wrapper.appendChild(visual);

    // Label content
    const labelArea = document.createElement("span");
    labelArea.className = "radio-label-area";
    labelArea.style.display = "flex";
    labelArea.style.alignItems = "center";
    labelArea.style.gap = "6px";

    if (opt.icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = opt.icon;
      iconEl.style.flexShrink = "0";
      labelArea.appendChild(iconEl);
    }

    if (opt.prefix) {
      const prefixEl = document.createElement("span");
      prefixEl.className = "radio-prefix";
      prefixEl.textContent = opt.prefix;
      prefixEl.style.cssText =
        "background:#f3f4f6;color:#6b7280;font-size:10px;font-weight:600;" +
        "padding:1px 5px;border-radius:3px;text-transform:uppercase;";
      labelArea.appendChild(prefixEl);
    }

    const labelText = document.createElement("span");
    labelText.textContent = opt.label;
    labelText.style.cssText = `font-size:${sc.fontSize};color:#374151;line-height:1.3;`;
    labelArea.appendChild(labelText);

    wrapper.appendChild(labelArea);

    // Events
    input.addEventListener("change", () => {
      selectOption(opt.value);
    });

    // Update visual on selection change
    function updateVisual(selected: boolean) {
      dot.style.transform = selected ? "scale(1)" : "scale(0)";
      if (selected) {
        visual.style.borderColor = "#3b82f6";
        visual.style.borderWidth = "2px";
      } else {
        visual.style.borderColor = "#d1d5db";
        visual.style.borderWidth = "2px";
      }
    }

    updateVisual(isSelected);

    // Store update ref
    (wrapper as unknown as { _updateVisual: (s: boolean) => void })._updateVisual = updateVisual;

    return { el: wrapper, input };
  }

  function createCardItem(opt: RadioOption, isSelected: boolean): { el: HTMLElement; input: HTMLInputElement } {
    const card = document.createElement("label");
    card.className = "radio-card-item";
    card.style.cssText =
      "display:flex;flex-direction:column;padding:" + sc.padding + ";gap:6px;" +
      "border:2px solid " + (isSelected ? "#3b82f6" : "#e5e7eb") + ";" +
      "border-radius:10px;cursor:" + (opt.disabled || disabled ? "not-allowed" : "pointer") + ";" +
      "transition:all 0.15s ease;flex:1;min-width:140px;" +
      (isSelected ? "background:#eff6ff;" : "background:#fff;") +
      (opt.disabled || disabled ? "opacity:0.5;" : "");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = name ?? `radio-card-${Math.random().toString(36).slice(2)}`;
    input.value = opt.value;
    input.checked = isSelected;
    input.disabled = opt.disabled || disabled;
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";

    card.appendChild(input);

    // Header row
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.alignItems = "center";
    headerRow.style.gap = "8px";

    // Circle indicator
    const indicator = document.createElement("span");
    indicator.style.cssText =
      `width:${sc.size};height:${sc.size};border-radius:50%;border:2px solid ${isSelected ? "#3b82f6" : "#d1d5db"};` +
      "flex-shrink:0;display:flex;align-items:center;justify-content:center;" +
      "transition:border-color 0.15s;";
    const innerDot = document.createElement("span");
    innerDot.style.cssText =
      `width:${parseInt(sc.size) - 8}px;height:${parseInt(sc.size) - 8}px;border-radius:50%;` +
      `background:${isSelected ? "#3b82f6" : "transparent"};transition:background 0.12s;`;
    indicator.appendChild(innerDot);
    headerRow.appendChild(indicator);

    if (opt.icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = opt.icon;
      iconEl.style.flexShrink = "0";
      headerRow.appendChild(iconEl);
    }

    const title = document.createElement("span");
    title.textContent = opt.label;
    title.style.cssText = `font-weight:500;font-size:${sc.fontSize};color:#111827;`;
    headerRow.appendChild(title);

    card.appendChild(headerRow);

    // Description
    if (opt.description) {
      const desc = document.createElement("p");
      desc.textContent = opt.description;
      desc.style.cssText = "margin:0;font-size:12px;color:#6b7280;line-height:1.4;";
      card.appendChild(desc);
    }

    // Hover effect
    if (!opt.disabled && !disabled) {
      card.addEventListener("mouseenter", () => {
        if (_selected !== opt.value) card.style.borderColor = "#93c5fd";
      });
      card.addEventListener("mouseleave", () => {
        if (_selected !== opt.value) card.style.borderColor = "#e5e7eb";
      });
    }

    input.addEventListener("change", () => selectOption(opt.value));

    (card as unknown as { _updateVisual: (s: boolean) => void })._updateVisual = (selected) => {
      card.style.borderColor = selected ? "#3b82f6" : "#e5e7eb";
      card.style.background = selected ? "#eff6ff" : "#fff";
      indicator.style.borderColor = selected ? "#3b82f6" : "#d1d5db";
      innerDot.style.background = selected ? "#3b82f6" : "transparent";
    };

    return { el: card, input };
  }

  function createButtonItem(opt: RadioOption, isSelected: boolean): { el: HTMLElement; input: HTMLInputElement } {
    const btn = document.createElement("label");
    btn.className = "radio-button-item";
    btn.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;padding:" + sc.padding + ";" +
      "border:1.5px solid " + (isSelected ? "#3b82f6" : "#d1d5db") + ";" +
      "border-radius:" + (direction === "horizontal" ? "9999px" : "8px") + ";" +
      "cursor:" + (opt.disabled || disabled ? "not-allowed" : "pointer") + ";" +
      "font-size:" + sc.fontSize + ";font-weight:500;color:" + (isSelected ? "#3b82f6" : "#374151") + ";" +
      "background:" + (isSelected ? "#eff6ff" : "#fff") + ";" +
      "transition:all 0.15s ease;user-select:none;" +
      (opt.disabled || disabled ? "opacity:0.5;" : "") +
      "white-space:nowrap;";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = name ?? `radio-btn-${Math.random().toString(36).slice(2)}`;
    input.value = opt.value;
    input.checked = isSelected;
    input.disabled = opt.disabled || disabled;
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";

    btn.appendChild(input);

    if (opt.icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = opt.icon;
      iconEl.style.marginRight = "4px";
      btn.appendChild(iconEl);
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = opt.label;
    btn.appendChild(textSpan);

    input.addEventListener("change", () => selectOption(opt.value));

    (btn as unknown as { _updateVisual: (s: boolean) => void })._updateVisual = (selected) => {
      btn.style.borderColor = selected ? "#3b82f6" : "#d1d5db";
      btn.style.color = selected ? "#3b82f6" : "#374151";
      btn.style.background = selected ? "#eff6ff" : "#fff";
    };

    return { el: btn, input };
  }

  // --- Selection Logic ---

  function selectOption(value: string): void {
    if (_selected === value) return;
    _selected = value;

    // Update all visuals
    for (const [val, wrapper] of Array.from(root.children)) {
      if (wrapper instanceof HTMLElement && (wrapper as unknown as { _updateVisual?: (s: boolean) => void })._updateVisual) {
        const input = inputEls.get(val);
        if (input) {
          (wrapper as unknown as { _updateVisual: (s: boolean) => void })._updateVisual!(val === value);
          input.checked = val === value;
          input.setAttribute("aria-checked", String(val === value));
        }
      }
    }

    const opt = options.find((o) => o.value === value);
    onChange?.(value, opt!);
  }

  // --- Instance ---

  const instance: RadioInstance = {
    el: root,

    getValue() { return _selected; },

    setValue(val: string) {
      if (!options.some((o) => o.value === val)) return;
      selectOption(val);
    },

    getSelected() { return options.find((o) => o.value === _selected); },

    clear() {
      selectOption("");
    },

    setDisabled(d: boolean) {
      disabled = d;
      for (const [, input] of inputEls) input.disabled = d;
    },

    setOptionDisabled(value: string, d: boolean) {
      const input = inputEls.get(value);
      if (input) input.disabled = d;
    },

    setError(msg?: string) {
      _error = msg ?? "";
      if (footerEl) {
        footerEl.textContent = _error;
        footerEl.style.color = "#dc2626";
      }
    },

    clearError() {
      _error = "";
      if (footerEl) {
        footerEl.textContent = helperText || "";
        footerEl.style.color = "#9ca3af";
      }
    },

    focus() {
      const firstInput = root.querySelector('input[type="radio"]') as HTMLInputElement | null;
      firstInput?.focus();
    },

    destroy() { root.remove(); },
  };

  if (container) container.appendChild(root);

  return instance;
}
