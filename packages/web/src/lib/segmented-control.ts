/**
 * Segmented Control: iOS-style segmented button group with animated indicator,
 * icons, disabled states, sizes, block mode, keyboard navigation, and ARIA support.
 */

// --- Types ---

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}

export type SegmentedSize = "sm" | "md" | "lg";

export interface SegmentedControlOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Segment options */
  options: SegmentedOption[];
  /** Initial value */
  value?: string;
  /** Size variant */
  size?: SegmentedSize;
  /** Block (full width) mode */
  block?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Callback on change */
  onChange?: (value: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SegmentedControlInstance {
  element: HTMLElement;
  getValue: () => string;
  setValue: (value: string) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<SegmentedSize, { height: number; fontSize: number; padding: number; radius: number }> = {
  sm: { height: 28, fontSize: 12, padding: 8, radius: 6 },
  md: { height: 34, fontSize: 13, padding: 12, radius: 8 },
  lg: { height: 40, fontSize: 14, padding: 16, radius: 10 },
};

// --- Main ---

export function createSegmentedControl(options: SegmentedControlOptions): SegmentedControlInstance {
  const opts = {
    size: options.size ?? "md",
    block: options.block ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SegmentedControl: container not found");

  const sz = SIZE_STYLES[opts.size];

  // Root element
  const root = document.createElement("div");
  root.className = `segmented-control ${opts.className}`;
  root.setAttribute("role", "tablist");
  root.style.cssText = `
    display:inline-flex;${opts.block ? "width:100%;" : ""}
    background:#f3f4f6;border-radius:${sz.radius}px;padding:3px;
    position:relative;font-family:-apple-system,sans-serif;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  container.appendChild(root);

  // State
  let currentValue = opts.value ?? opts.options[0]?.value ?? "";
  let destroyed = false;

  // Animated indicator
  const indicator = document.createElement("div");
  indicator.className = "segmented-indicator";
  indicator.style.cssText = `
    position:absolute;height:${sz.height - 6}px;border-radius:${sz.radius - 2}px;
    background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1);
    transition:left 0.25s cubic-bezier(0.4,0,0.2,1),width 0.25s cubic-bezier(0.4,0,0.2,1);
    top:3px;z-index:1;
  `;
  root.appendChild(indicator);

  // Buttons
  const buttons: HTMLButtonElement[] = [];

  for (let i = 0; i < opts.options.length; i++) {
    const opt = opts.options[i]!;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "segmented-btn";
    btn.setAttribute("role", "tab");
    btn.dataset.value = opt.value;
    btn.style.cssText = `
      position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;
      gap:5px;padding:0 ${sz.padding}px;height:${sz.height - 6}px;
      font-size:${sz.fontSize}px;font-weight:500;color:#6b7280;
      border:none;background:transparent;cursor:pointer;border-radius:${sz.radius - 2}px;
      transition:color 0.2s ease;white-space:nowrap;flex:1;
      ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
      ${opts.block ? "" : ""}
    `;

    // Icon
    if (opt.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.textContent = opt.icon;
      iconSpan.style.cssText = "font-size:14px;";
      btn.appendChild(iconSpan);
    }

    // Label
    const labelSpan = document.createElement("span");
    labelSpan.textContent = opt.label;
    btn.appendChild(labelSpan);

    // Badge
    if (opt.badge !== undefined && opt.badge !== null) {
      const badge = document.createElement("span");
      badge.style.cssText = `
        min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;
        font-size:10px;font-weight:600;display:inline-flex;align-items:center;
        justify-content:center;padding:0 4px;margin-left:2px;line-height:1;
      `;
      badge.textContent = String(opt.badge);
      btn.appendChild(badge);
    }

    if (!opt.disabled) {
      btn.addEventListener("click", () => {
        setValue(opt.value);
      });
    }

    root.appendChild(btn);
    buttons.push(btn);
  }

  function updateIndicator(): void {
    const activeIdx = opts.options.findIndex((o) => o.value === currentValue);
    if (activeIdx < 0) return;

    let leftOffset = 0;
    for (let i = 0; i < activeIdx; i++) {
      leftOffset += (buttons[i]!.offsetWidth || 0);
    }
    const activeWidth = buttons[activeIdx]!.offsetWidth || 0;

    indicator.style.left = `${leftOffset + 3}px`;
    indicator.style.width = `${activeWidth - 6}px`;

    // Update button styles
    for (let i = 0; i < buttons.length; i++) {
      const isActive = i === activeIdx;
      buttons[i]!.style.color = isActive ? "#111827" : "#6b7280";
      buttons[i]!.style.fontWeight = isActive ? "600" : "500";
      buttons[i]!.setAttribute("aria-selected", String(isActive));
    }
  }

  function setValue(value: string): void {
    if (opts.disabled) return;
    const opt = opts.options.find((o) => o.value === value);
    if (!opt || opt.disabled) return;
    currentValue = value;
    updateIndicator();
    opts.onChange?.(value);
  }

  // Keyboard navigation
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    const currentIdx = opts.options.findIndex((o) => o.value === currentValue);
    let nextIdx = currentIdx;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        do { nextIdx = (nextIdx - 1 + opts.options.length) % opts.options.length; } while (opts.options[nextIdx]?.disabled);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        do { nextIdx = (nextIdx + 1) % opts.options.length; } while (opts.options[nextIdx]?.disabled);
        break;
      case "Home":
        e.preventDefault();
        nextIdx = 0;
        while (opts.options[nextIdx]?.disabled) nextIdx++;
        break;
      case "End":
        e.preventDefault();
        nextIdx = opts.options.length - 1;
        while (opts.options[nextIdx]?.disabled) nextIdx--;
        break;
      default:
        return;
    }
    setValue(opts.options[nextIdx]!.value);
  });

  // Initial render
  updateIndicator();

  const instance: SegmentedControlInstance = {
    element: root,

    getValue() { return currentValue; },

    setValue(val: string) { setValue(val); },

    disable() {
      opts.disabled = true;
      root.style.opacity = "0.5";
      root.style.pointerEvents = "none";
    },

    enable() {
      opts.disabled = false;
      root.style.opacity = "";
      root.style.pointerEvents = "";
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
