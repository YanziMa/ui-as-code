/**
 * Toggle / Switch: Accessible toggle switch with sizes, labels,
 * disabled state, loading state, animations, and ARIA support.
 */

// --- Types ---

export type ToggleSize = "sm" | "md" | "lg";
export type ToggleVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface ToggleOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial checked state */
  checked?: boolean;
  /** Size variant */
  size?: ToggleSize;
  /** Color variant */
  variant?: ToggleVariant;
  /** Label text (shown on the right) */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading/indeterminate state */
  loading?: boolean;
  /** Custom track color when ON */
  activeColor?: string;
  /** Custom thumb color */
  thumbColor?: string;
  /** Callback on change */
  onChange?: (checked: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ToggleInstance {
  element: HTMLElement;
  getValue: () => boolean;
  setValue: (checked: boolean) => void;
  toggle: () => void;
  disable: () => void;
  enable: () => void;
  setLoading: (loading: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<ToggleSize, { width: number; height: number; thumb: number; fontSize: number }> = {
  sm: { width: 32, height: 18, thumb: 14, fontSize: 12 },
  md: { width: 40, height: 22, thumb: 18, fontSize: 13 },
  lg: { width: 48, height: 26, thumb: 22, fontSize: 14 },
};

const VARIANT_COLORS: Record<ToggleVariant, { active: string; inactive: string }> = {
  default:  { active: "#6b7280", inactive: "#d1d5db" },
  primary:  { active: "#3b82f6", inactive: "#bfdbfe" },
  success:  { active: "#22c55e", inactive: "#bbf7d0" },
  warning:  { active: "#f59e0b", inactive: "#fde68a" },
  danger:   { active: "#ef4444", inactive: "#fecaca" },
};

// --- Main Class ---

export class ToggleManager {
  create(options: ToggleOptions): ToggleInstance {
    const opts = {
      checked: options.checked ?? false,
      size: options.size ?? "md",
      variant: options.variant ?? "primary",
      disabled: options.disabled ?? false,
      loading: options.loading ?? false,
      activeColor: options.activeColor,
      thumbColor: options.thumbColor ?? "#fff",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Toggle: container not found");

    const sz = SIZE_MAP[opts.size];
    const colors = VARIANT_COLORS[opts.variant];
    const activeColor = opts.activeColor ?? colors.active;

    // Build wrapper
    const wrapper = document.createElement("label");
    wrapper.className = `toggle-wrapper ${opts.className ?? ""}`;
    wrapper.style.cssText = `
      display:inline-flex;align-items:center;gap:8px;
      cursor:${opts.disabled ? "not-allowed" : "pointer"};
      user-select:none;font-family:-apple-system,sans-serif;
      font-size:${sz.fontSize}px;color:#374151;
      position:relative;
    `;

    // Hidden input for accessibility
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "toggle-input";
    input.checked = opts.checked;
    input.disabled = opts.disabled;
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
    wrapper.appendChild(input);

    // Track
    const track = document.createElement("div");
    track.className = "toggle-track";
    track.style.cssText = `
      position:relative;width:${sz.width}px;height:${sz.height}px;
      border-radius:${sz.height / 2}px;background:${colors.inactive};
      transition:background 0.25s ease;flex-shrink:0;
    `;

    // Thumb
    const thumb = document.createElement("div");
    thumb.className = "toggle-thumb";
    thumb.style.cssText = `
      position:absolute;top:2px;left:2px;
      width:${sz.thumb}px;height:${sz.thumb}px;border-radius:50%;
      background:${opts.thumbColor};box-shadow:0 1px 3px rgba(0,0,0,0.15);
      transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    track.appendChild(thumb);

    // Loading spinner inside thumb
    let spinnerEl: HTMLDivElement | null = null;
    if (opts.loading) {
      spinnerEl = document.createElement("div");
      spinnerEl.style.cssText = `
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      `;
      spinnerEl.innerHTML = `<svg width="${Math.round(sz.thumb * 0.55)}" height="${Math.round(sz.thumb * 0.55)}" viewBox="0 0 24 24" fill="none" stroke="${activeColor}" stroke-width="3"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`;
      spinnerEl.style.animation = "spin 1s linear infinite";
      thumb.appendChild(spinnerEl);
    }

    wrapper.appendChild(track);

    // Label area
    if (opts.label || opts.description) {
      const labelArea = document.createElement("span");
      labelArea.className = "toggle-label-area";
      labelArea.style.cssText = "display:flex;flex-direction:column;";

      if (opts.label) {
        const labelText = document.createElement("span");
        labelText.className = "toggle-label-text";
        labelText.style.cssText = "font-weight:500;line-height:1.2;";
        labelText.textContent = opts.label;
        labelArea.appendChild(labelText);
      }

      if (opts.description) {
        const descText = document.createElement("span");
        descText.className = "toggle-description";
        descText.style.cssText = `font-size:${sz.fontSize - 1}px;color:#9ca3af;line-height:1.2;margin-top:1px;`;
        descText.textContent = opts.description;
        labelArea.appendChild(descText);
      }

      wrapper.appendChild(labelArea);
    }

    container.appendChild(wrapper);

    // State management
    function updateVisuals(): void {
      if (input.checked) {
        track.style.background = activeColor;
        thumb.style.transform = `translateX(${sz.width - sz.thumb - 4}px)`;
      } else {
        track.style.background = colors.inactive;
        thumb.style.transform = "translateX(0)";
      }
    }

    function handleToggle(): void {
      if (opts.disabled || opts.loading) return;
      input.checked = !input.checked;
      updateVisuals();
      opts.onChange?.(input.checked);
    }

    // Event listeners
    wrapper.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".toggle-track") || (e.target as HTMLElement).closest(".toggle-label-area")) {
        handleToggle();
      }
    });

    // Keyboard support
    input.addEventListener("change", () => {
      updateVisuals();
      opts.onChange?.(input.checked);
    });

    // Hover effect on track
    track.addEventListener("mouseenter", () => {
      if (!opts.disabled && !input.checked) {
        track.style.background = `${colors.inactive}dd`;
      }
    });
    track.addEventListener("mouseleave", () => {
      if (!input.checked) updateVisuals();
    });

    // Inject spin keyframe
    if (!document.getElementById("toggle-styles")) {
      const s = document.createElement("style");
      s.id = "toggle-styles";
      s.textContent = "@keyframes spin{to{transform:rotate(360deg);}}";
      document.head.appendChild(s);
    }

    // Initial render
    updateVisuals();

    const instance: ToggleInstance = {
      element: wrapper,

      getValue() { return input.checked; },

      setValue(checked: boolean) {
        input.checked = checked;
        updateVisuals();
      },

      toggle() {
        handleToggle();
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

      setLoading(loading: boolean) {
        opts.loading = loading;
        if (loading && !spinnerEl) {
          spinnerEl = document.createElement("div");
          spinnerEl.style.cssText = `
            position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          `;
          spinnerEl.innerHTML = `<svg width="${Math.round(sz.thumb * 0.55)}" height="${Math.round(sz.thumb * 0.55)}" viewBox="0 0 24 24" fill="none" stroke="${activeColor}" stroke-width="3"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`;
          spinnerEl.style.animation = "spin 1s linear infinite";
          thumb.appendChild(spinnerEl);
        } else if (!loading && spinnerEl) {
          spinnerEl.remove();
          spinnerEl = null;
        }
      },

      destroy() {
        wrapper.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a toggle switch */
export function createToggle(options: ToggleOptions): ToggleInstance {
  return new ToggleManager().create(options);
}
