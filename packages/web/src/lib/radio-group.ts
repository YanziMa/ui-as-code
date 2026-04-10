/**
 * Radio Group: Radio button group component with horizontal/vertical layout,
 * variants, disabled state, keyboard navigation, ARIA support, and custom styling.
 */

// --- Types ---

export type RadioSize = "sm" | "md" | "lg";
export type RadioVariant = "default" | "primary" | "card";

export interface RadioOption {
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

export interface RadioGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Array of radio options */
  options: RadioOption[];
  /** Initial selected value */
  value?: string;
  /** Size variant */
  size?: RadioSize;
  /** Visual variant */
  variant?: RadioVariant;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Gap between options (px) */
  gap?: number;
  /** Name attribute for inputs */
  name?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Callback on change */
  onChange?: (value: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RadioGroupInstance {
  element: HTMLElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getSelectedIndex: () => number;
  setSelectedIndex: (index: number) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<RadioSize, { fontSize: number; dotSize: number; paddingX: number; paddingY: number }> = {
  sm: { fontSize: 12, dotSize: 14, paddingX: 6, paddingY: 2 },
  md: { fontSize: 13, dotSize: 16, paddingX: 8, paddingY: 4 },
  lg: { fontSize: 14, dotSize: 18, paddingX: 10, paddingY: 5 },
};

// --- Main ---

export function createRadioGroup(options: RadioGroupOptions): RadioGroupInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    direction: options.direction ?? "vertical",
    gap: options.gap ?? 8,
    name: options.name ?? `radio-${Date.now()}`,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RadioGroup: container not found");

  const sz = SIZE_STYLES[opts.size];

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `radio-group radio-${opts.variant} radio-${opts.direction} ${opts.className}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:${opts.direction};gap:${opts.gap}px;
    font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  let currentValue = opts.value ?? opts.options[0]?.value ?? "";

  function render(): void {
    wrapper.innerHTML = "";

    for (let i = 0; i < opts.options.length; i++) {
      const opt = opts.options[i]!;
      const isSelected = opt.value === currentValue;
      const isDisabled = opts.disabled || opt.disabled;

      const item = document.createElement("label");
      item.className = `radio-item ${isSelected ? "radio-selected" : ""} ${isDisabled ? "radio-disabled" : ""}`;
      item.dataset.value = opt.value;

      if (opts.variant === "card") {
        // Card style
        item.style.cssText = `
          display:flex;align-items:flex-start;gap:8px;padding:${sz.paddingY}px ${sz.paddingX}px;
          border:2px solid ${isSelected ? "#6366f1" : "#e5e7eb"};border-radius:10px;
          cursor:${isDisabled ? "not-allowed" : "pointer"};
          background:${isSelected ? "#eef2ff" : "#fff"};
          transition:border-color 0.15s,background 0.15s,box-shadow 0.15s;
          ${isDisabled ? "opacity:0.5;" : ""}
        `;
        item.addEventListener("mouseenter", () => {
          if (!isDisabled && !isSelected) item.style.borderColor = "#a5b4fc";
        });
        item.addEventListener("mouseleave", () => {
          if (!isDisabled) item.style.borderColor = isSelected ? "#6366f1" : "#e5e7eb";
        });
      } else {
        // Default / primary style
        item.style.cssText = `
          display:inline-flex;align-items:center;gap:8px;padding:${sz.paddingY}px ${sz.paddingX}px;
          cursor:${isDisabled ? "not-allowed" : "pointer"};
          user-select:none;font-size:${sz.fontSize}px;color:#374151;
          transition:color 0.15s;border-radius:6px;
          ${isDisabled ? "opacity:0.5;" : ""}
        `;
        item.addEventListener("mouseenter", () => {
          if (!isDisabled) item.style.background = "#f3f4f6";
        });
        item.addEventListener("mouseleave", () => {
          if (!isDisabled) item.style.background = "";
        });
      }

      // Hidden input
      const input = document.createElement("input");
      input.type = "radio";
      input.name = opts.name;
      input.value = opt.value;
      input.checked = isSelected;
      input.disabled = isDisabled;
      input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
      item.appendChild(input);

      // Visual indicator
      if (opts.variant !== "card") {
        const dotOuter = document.createElement("span");
        dotOuter.className = "radio-dot-outer";
        dotOuter.style.cssText = `
          display:inline-flex;align-items:center;justify-content:center;
          width:${sz.dotSize}px;height:${sz.dotSize}px;border-radius:50%;
          border:2px solid ${isSelected ? "#6366f1" : "#d1d5db"};
          flex-shrink:0;transition:border-color 0.15s;
        `;

        const dotInner = document.createElement("span");
        dotInner.className = "radio-dot-inner";
        dotInner.style.cssText = `
          width:${sz.dotSize - 6}px;height:${sz.dotSize - 6}px;border-radius:50%;
          background:#6366f1;transform:scale(${isSelected ? 1 : 0});
          transition:transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        dotOuter.appendChild(dotInner);
        item.appendChild(dotOuter);
      } else {
        // Card uses a checkmark instead of dot
        const checkIcon = document.createElement("span");
        checkIcon.style.cssText = `
          display:inline-flex;align-items:center;justify-content:center;
          width:18px;height:18px;border-radius:50%;
          flex-shrink:0;margin-top:1px;
        `;
        checkIcon.innerHTML = isSelected
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
        item.appendChild(checkIcon);
      }

      // Icon
      if (opt.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = opt.icon;
        iconEl.style.cssText = "font-size:inherit;line-height:1;";
        item.appendChild(iconEl);
      }

      // Label text area
      const textArea = document.createElement("span");
      textArea.style.cssText = "display:flex;flex-direction:column;";

      const labelText = document.createElement("span");
      labelText.textContent = opt.label;
      labelText.style.cssText = `font-weight:500;line-height:1.3;${isDisabled ? "color:#9ca3af;" : ""}`;
      textArea.appendChild(labelText);

      if (opt.description) {
        const desc = document.createElement("span");
        desc.textContent = opt.description;
        desc.style.cssText = `font-size:${sz.fontSize - 1}px;color:#9ca3af;margin-top:1px;line-height:1.3;`;
        textArea.appendChild(desc);
      }

      item.appendChild(textArea);
      wrapper.appendChild(item);

      // Click handler
      item.addEventListener("click", () => {
        if (isDisabled || currentValue === opt.value) return;
        currentValue = opt.value;
        render();
        opts.onChange?.(currentValue);
      });

      // Keyboard: arrow keys navigate between options
      item.addEventListener("keydown", (e: KeyboardEvent) => {
        if (isDisabled) return;
        let nextIdx = i;
        switch (e.key) {
          case "ArrowDown":
          case "ArrowRight":
            e.preventDefault();
            nextIdx = (i + 1) % opts.options.length;
            break;
          case "ArrowUp":
          case "ArrowLeft":
            e.preventDefault();
            nextIdx = (i - 1 + opts.options.length) % opts.options.length;
            break;
          default:
            return;
        }
        while (nextIdx !== i && opts.options[nextIdx]?.disabled) {
          nextIdx = e.key === "ArrowDown" || e.key === "ArrowRight"
            ? (nextIdx + 1) % opts.options.length
            : (nextIdx - 1 + opts.options.length) % opts.options.length;
        }
        if (!opts.options[nextIdx]?.disabled) {
          currentValue = opts.options[nextIdx]!.value;
          render();
          opts.onChange?.(currentValue);
        }
      });
    }
  }

  render();

  const instance: RadioGroupInstance = {
    element: wrapper,

    getValue() { return currentValue; },

    setValue(value: string) {
      if (opts.options.some((o) => o.value === value)) {
        currentValue = value;
        render();
      }
    },

    getSelectedIndex() {
      return opts.options.findIndex((o) => o.value === currentValue);
    },

    setSelectedIndex(index: number) {
      if (index >= 0 && index < opts.options.length && !opts.options[index]?.disabled) {
        currentValue = opts.options[index]!.value;
        render();
      }
    },

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
