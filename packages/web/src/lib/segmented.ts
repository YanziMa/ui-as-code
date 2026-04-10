/**
 * Segmented Control: Button-group style toggle for switching between options
 * with animated indicator, icon support, disabled states, block/full-width mode,
 * size variants, and keyboard navigation.
 */

// --- Types ---

export type SegmentedSize = "sm" | "md" | "lg";
export type SegmentedBlockMode = "default" | "block" | "full";

export interface SegmentedOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Tooltip text */
  title?: string;
}

export interface SegmentedOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Available options */
  options: SegmentedOption[];
  /** Currently selected value */
  value?: string;
  /** Size variant */
  size?: SegmentedSize;
  /** Block mode (default, block, full width) */
  blockMode?: SegmentedBlockMode;
  /** Show animated sliding indicator? */
  showIndicator?: boolean;
  /** Callback on change */
  onChange?: (value: string, option: SegmentedOption) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SegmentedInstance {
  element: HTMLElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getOption: () => SegmentedOption | undefined;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<SegmentedSize, {
  height: number;
  fontSize: number;
  paddingX: number;
  gap: number;
  radius: number;
}> = {
  sm: { height: 28, fontSize: 12, paddingX: 12, gap: 2, radius: 6 },
  md: { height: 36, fontSize: 13, paddingX: 16, gap: 2, radius: 8 },
  lg: { height: 44, fontSize: 15, paddingX: 20, gap: 3, radius: 10 },
};

// --- Main Class ---

export class SegmentedControlManager {
  create(options: SegmentedOptions): SegmentedInstance {
    const opts = {
      value: options.value ?? options.options[0]?.value ?? "",
      size: options.size ?? "md",
      blockMode: options.blockMode ?? "default",
      showIndicator: options.showIndicator ?? true,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("SegmentedControl: container not found");

    let currentValue = opts.value;
    let destroyed = false;
    let allDisabled = false;

    const sz = SIZE_STYLES[opts.size];

    // Root
    const root = document.createElement("div");
    root.className = `segmented-control segmented-${opts.size} segmented-${opts.blockMode} ${opts.className}`;
    root.setAttribute("role", "tablist");
    root.style.cssText = `
      display:inline-flex;position:relative;background:#f3f4f6;border-radius:${sz.radius}px;
      padding:${sz.gap}px;${opts.blockMode === "full" ? "width:100%;" : ""}
      ${opts.blockMode === "block" ? "width:100%;" : ""}
    `;

    // Sliding indicator
    let indicator: HTMLDivElement | null = null;
    if (opts.showIndicator) {
      indicator = document.createElement("div");
      indicator.className = "segmented-indicator";
      indicator.style.cssText = `
        position:absolute;height:${sz.height - sz.gap * 2}px;border-radius:${sz.radius - sz.gap}px;
        background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.12);
        transition:left ${opts.size === "sm" ? "200" : opts.size === "lg" ? "280" : "240"}ms cubic-bezier(0.25,0.1,0.25,1),
                    width ${opts.size === "sm" ? "200" : opts.size === "lg" ? "280" : "240"}ms cubic-bezier(0.25,0.1,0.25,1);
        z-index:0;top:${sz.gap}px;
      `;
      root.appendChild(indicator);
    }

    // Track button elements by value
    const buttonMap = new Map<string, HTMLButtonElement>();

    function render(): void {
      // Clear existing buttons (keep indicator)
      const existingButtons = root.querySelectorAll<HTMLButtonElement>("[role='tab']");
      existingButtons.forEach((b) => b.remove());
      buttonMap.clear();

      for (let i = 0; i < opts.options.length; i++) {
        const opt = opts.options[i]!;
        const isActive = opt.value === currentValue;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", String(isActive));
        btn.dataset.value = opt.value;
        btn.disabled = opt.disabled || allDisabled;
        if (opt.title) btn.title = opt.title;

        btn.style.cssText = `
          position:relative;z-index:1;display:flex;align-items:center;justify-content:center;
          gap:6px;padding:0 ${sz.paddingX}px;height:${sz.height - sz.gap * 2}px;
          border:none;border-radius:${sz.radius - sz.gap}px;font-size:${sz.fontSize}px;
          font-weight:${isActive ? 600 : 400};color:${isActive ? "#111827" : "#6b7280"};
          background:transparent;cursor:${opt.disabled || allDisabled ? "not-allowed" : "pointer"};
          transition:color 0.15s;white-space:nowrap;flex:1;
          font-family:-apple-system,BlinkMacSystemFont,sans-serif;user-select:none;
        `;

        // Icon
        if (opt.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.textContent = opt.icon;
          iconSpan.style.cssText = `font-size:${sz.fontSize + 2}px;line-height:1;`;
          btn.appendChild(iconSpan);
        }

        // Label
        const labelSpan = document.createElement("span");
        labelSpan.textContent = opt.label;
        btn.appendChild(labelSpan);

        // Click handler
        btn.addEventListener("click", () => {
          if (opt.disabled || allDisabled || opt.value === currentValue) return;
          setValue(opt.value);
        });

        // Hover
        btn.addEventListener("mouseenter", () => {
          if (!opt.disabled && !allDisabled && opt.value !== currentValue) {
            btn.style.color = "#374151";
            btn.style.background = "rgba(255,255,255,0.5)";
          }
        });
        btn.addEventListener("mouseleave", () => {
          if (!opt.disabled && !allDisabled && opt.value !== currentValue) {
            btn.style.color = "#6b7280";
            btn.style.background = "transparent";
          }
        });

        root.appendChild(btn);
        buttonMap.set(opt.value, btn);
      }

      // Position indicator after all buttons are in DOM
      updateIndicator();
    }

    function updateIndicator(): void {
      if (!indicator || !root.isConnected) return;
      const activeBtn = buttonMap.get(currentValue);
      if (!activeBtn) return;

      const rootRect = root.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();

      indicator.style.left = `${btnRect.left - rootRect.left + sz.gap}px`;
      indicator.style.width = `${btnRect.width - sz.gap * 2}px`;
    }

    function setValue(value: string): void {
      const opt = opts.options.find((o) => o.value === value);
      if (!opt || opt.disabled || allDisabled) return;

      currentValue = value;

      // Update ARIA states
      buttonMap.forEach((btn, val) => {
        btn.setAttribute("aria-selected", String(val === value));
        btn.style.fontWeight = val === value ? "600" : "400";
        btn.style.color = val === value ? "#111827" : "#6b7280";
      });

      updateIndicator();
      opts.onChange?.(value, opt);
    }

    // Keyboard navigation
    root.addEventListener("keydown", (e: KeyboardEvent) => {
      const values = opts.options.filter((o) => !o.disabled).map((o) => o.value);
      const idx = values.indexOf(currentValue);

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          if (idx < values.length - 1) setValue(values[idx + 1]!);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          if (idx > 0) setValue(values[idx - 1]!);
          break;
        case "Home":
          e.preventDefault();
          if (values.length > 0) setValue(values[0]!);
          break;
        case "End":
          e.preventDefault();
          if (values.length > 0) setValue(values[values.length - 1]!);
          break;
      }
    });

    // ResizeObserver to reposition indicator on container resize
    const resizeObserver = new ResizeObserver(() => updateIndicator());
    resizeObserver.observe(root);

    // Initial render
    render();

    const instance: SegmentedInstance = {
      element: root,

      getValue() { return currentValue; },

      setValue(value: string) { setValue(value); },

      getOption() {
        return opts.options.find((o) => o.value === currentValue);
      },

      setDisabled(disabled: boolean) {
        allDisabled = disabled;
        buttonMap.forEach((btn) => { btn.disabled = disabled; });
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        resizeObserver.disconnect();
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a segmented control */
export function createSegmentedControl(options: SegmentedOptions): SegmentedInstance {
  return new SegmentedControlManager().create(options);
}
