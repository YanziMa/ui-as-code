/**
 * Toggle Switch: Styled toggle/switch component with sizes, variants,
 * labels, disabled state, loading state, animations, and ARIA support.
 */

// --- Types ---

export type SwitchSize = "sm" | "md" | "lg";
export type SwitchVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface SwitchOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial checked state */
  checked?: boolean;
  /** Size variant */
  size?: SwitchSize;
  /** Color variant */
  variant?: SwitchVariant;
  /** Label text (shown alongside) */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show loading spinner when toggling */
  loading?: boolean;
  /** Label position */
  labelPosition?: "right" | "left";
  /** Callback on change */
  onChange?: (checked: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SwitchInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => boolean;
  setValue: (checked: boolean) => void;
  toggle: () => void;
  setLoading: (loading: boolean) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<SwitchSize, { width: number; height: number; thumb: number; fontSize: number }> = {
  sm: { width: 34, height: 18, thumb: 14, fontSize: 12 },
  md: { width: 40, height: 22, thumb: 18, fontSize: 13 },
  lg: { width: 48, height: 26, thumb: 22, fontSize: 14 },
};

const VARIANT_COLORS: Record<SwitchVariant, { active: string; inactiveBg: string; activeBg: string; border: string }> = {
  default:  { active: "#374151", inactiveBg: "#d1d5db", activeBg: "#374151", border: "#d1d5db" },
  primary:  { active: "#fff",    inactiveBg: "#c7d2fe", activeBg: "#4338ca",   border: "#a5b4fc" },
  success:  { active: "#fff",    inactiveBg: "#86efac", activeBg: "#16a34a",   border: "#86efac" },
  warning:  { active: "#fff",    inactiveBg: "#fcd34d", activeBg: "#d97706",   border: "#fcd34d" },
  danger:   { active: "#fff",    inactiveBg: "#fca5a5", activeBg: "#dc2626",   border: "#fca5a5" },
};

// --- Main ---

export function createSwitch(options: SwitchOptions): SwitchInstance {
  const opts = {
    checked: options.checked ?? false,
    size: options.size ?? "md",
    variant: options.variant ?? "primary",
    disabled: options.disabled ?? false,
    loading: options.loading ?? false,
    labelPosition: options.labelPosition ?? "right",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Switch: container not found");

  const sz = SIZE_MAP[opts.size];
  const colors = VARIANT_COLORS[opts.variant];

  // Wrapper (label)
  const wrapper = document.createElement("label");
  wrapper.className = `switch-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;gap:10px;
    cursor:${opts.disabled ? "not-allowed" : "pointer"};
    user-select:none;font-family:-apple-system,sans-serif;
    font-size:${sz.fontSize}px;color:#374151;position:relative;
  `;

  // Hidden input
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "switch-input";
  input.checked = opts.checked;
  input.disabled = opts.disabled;
  input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
  wrapper.appendChild(input);

  // Track
  const track = document.createElement("div");
  track.className = "switch-track";
  track.style.cssText = `
    flex-shrink:0;position:relative;width:${sz.width}px;height:${sz.height}px;
    border-radius:${sz.height / 2}px;background:${opts.checked ? colors.activeBg : colors.inactiveBg};
    border:1px solid ${opts.checked ? colors.activeBg : colors.border};
    transition:background 0.2s ease,border-color 0.2s ease;
  `;
  wrapper.appendChild(track);

  // Thumb
  const thumb = document.createElement("div");
  thumb.className = "switch-thumb";
  const thumbOffset = sz.width - sz.height - 2;
  thumb.style.cssText = `
    position:absolute;top:1px;left:${opts.checked ? `${thumbOffset}px` : "1px"};
    width:${sz.thumb}px;height:${sz.thumb}px;border-radius:50%;
    background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.15),0 1px 2px rgba(0,0,0,0.1);
    transition:left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display:flex;align-items:center;justify-content:center;
  `;
  track.appendChild(thumb);

  // Loading spinner inside thumb
  if (opts.loading) {
    renderSpinner(thumb, sz.thumb);
  }

  // Label area
  if (opts.label || opts.description) {
    const labelArea = document.createElement("span");
    labelArea.style.cssText = "display:flex;flex-direction:column;";

    if (opts.label) {
      const labelText = document.createElement("span");
      labelText.style.cssText = `font-weight:400;${opts.disabled ? "color:#9ca3af;" : ""}`;
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
      wrapper.insertBefore(labelArea, track);
    } else {
      wrapper.appendChild(labelArea);
    }
  }

  container.appendChild(wrapper);

  // Click handler
  wrapper.addEventListener("click", () => {
    if (opts.disabled || opts.loading) return;
    input.checked = !input.checked;
    updateVisual();
    opts.onChange?.(input.checked);
  });

  function updateVisual(): void {
    const offset = sz.width - sz.height - 2;
    track.style.background = input.checked ? colors.activeBg : colors.inactiveBg;
    track.style.borderColor = input.checked ? colors.activeBg : colors.border;
    thumb.style.left = input.checked ? `${offset}px` : "1px";
  }

  function renderSpinner(el: HTMLElement, size: number): void {
    el.innerHTML = `<svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="3" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    if (!document.getElementById("switch-spinner-style")) {
      const s = document.createElement("style");
      s.id = "switch-spinner-style";
      s.textContent = "@keyframes spin{to{transform:rotate(360deg);}}";
      document.head.appendChild(s);
    }
  }

  // Focus ring
  input.addEventListener("focus", () => {
    track.style.boxShadow = `0 0 0 3px ${colors.activeBg}30`;
  });
  input.addEventListener("blur", () => {
    track.style.boxShadow = "";
  });

  const instance: SwitchInstance = {
    element: wrapper,
    inputEl: input,

    getValue() { return input.checked; },

    setValue(checked: boolean) {
      input.checked = checked;
      updateVisual();
    },

    toggle() {
      if (!opts.disabled && !opts.loading) {
        input.checked = !input.checked;
        updateVisual();
        opts.onChange?.(input.checked);
      }
    },

    setLoading(loading: boolean) {
      opts.loading = loading;
      if (loading) {
        renderSpinner(thumb, sz.thumb);
        wrapper.style.cursor = "not-allowed";
      } else {
        thumb.innerHTML = "";
        wrapper.style.cursor = opts.disabled ? "not-allowed" : "pointer";
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
