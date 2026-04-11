/**
 * Switch Toggle: On/off toggle switch with sizes, variants, icons,
 * labels, disabled state, loading state, keyboard support, and ARIA.
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
  /** Visual variant (color scheme) */
  variant?: SwitchVariant;
  /** Label text */
  label?: string;
  /** Description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading / indeterminate spinner */
  loading?: boolean;
  /** Show on/off text inside thumb */
  showLabelInside?: boolean;
  /** Custom on label (default "ON") */
  onLabel?: string;
  /** Custom off label (default "OFF") */
  offLabel?: string;
  /** Name attribute for form input */
  name?: string;
  /** Callback on toggle */
  onChange?: (checked: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SwitchInstance {
  element: HTMLElement;
  isChecked: () => void;
  setChecked: (checked: boolean) => void;
  toggle: () => void;
  disable: () => void;
  enable: () => void;
  setLoading: (loading: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<SwitchSize, { width: number; height: number; thumbSize: number; fontSize: number }> = {
  sm: { width: 36, height: 20, thumbSize: 16, fontSize: 9 },
  md: { width: 44, height: 24, thumbSize: 20, fontSize: 10 },
  lg: { width: 54, height: 28, thumbSize: 24, fontSize: 11 },
};

const VARIANT_COLORS: Record<SwitchVariant, { activeBg: string; activeBorder: string; inactiveBg: string; inactiveBorder: string; thumbColor: string }> = {
  default:   { activeBg: "#374151",   activeBorder: "#374151",   inactiveBg: "#d1d5db", inactiveBorder: "#d1d5db", thumbColor: "#fff" },
  primary:   { activeBg: "#6366f1",   activeBorder: "#6366f1",   inactiveBg: "#d1d5db", inactiveBorder: "#d1d5db", thumbColor: "#fff" },
  success:   { activeBg: "#22c55e",   activeBorder: "#22c55e",   inactiveBg: "#d1d5db", inactiveBorder: "#d1d5db", thumbColor: "#fff" },
  warning:   { activeBg: "#f59e0b",   activeBorder: "#f59e0b",   inactiveBg: "#d1d5db", inactiveBorder: "#d1d5db", thumbColor: "#fff" },
  danger:    { activeBg: "#ef4444",   activeBorder: "#ef4444",   inactiveBg: "#d1d5db", inactiveBorder: "#d1d5db", thumbColor: "#fff" },
};

// --- Main ---

export function createSwitch(options: SwitchOptions): SwitchInstance {
  const opts = {
    checked: options.checked ?? false,
    size: options.size ?? "md",
    variant: options.variant ?? "primary",
    label: options.label ?? "",
    description: options.description ?? "",
    disabled: options.disabled ?? false,
    loading: options.loading ?? false,
    showLabelInside: options.showLabelInside ?? false,
    onLabel: options.onLabel ?? "ON",
    offLabel: options.offLabel ?? "OFF",
    name: options.name ?? `switch-${Date.now()}`,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Switch: container not found");

  const sz = SIZE_MAP[opts.size];
  const colors = VARIANT_COLORS[opts.variant];

  // Root wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `switch-wrapper switch-${opts.size} switch-${opts.variant} ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;gap:10px;
    font-family:-apple-system,sans-serif;
    ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : "cursor:pointer;"}
  `;

  // Switch track + thumb
  const track = document.createElement("button");
  track.type = "button";
  track.role = "switch";
  track.setAttribute("aria-checked", String(opts.checked));
  if (opts.disabled) track.setAttribute("aria-disabled", "true");
  if (opts.label) track.setAttribute("aria-label", opts.label);
  track.style.cssText = `
    position:relative;display:inline-flex;align-items:center;
    width:${sz.width}px;height:${sz.height}px;border-radius:${sz.height / 2}px;
    border:2px solid ${opts.checked ? colors.activeBorder : colors.inactiveBorder};
    background:${opts.checked ? colors.activeBg : colors.inactiveBg};
    padding:2px;cursor:${opts.disabled ? "not-allowed" : "pointer"};
    transition:background-color 0.25s ease,border-color 0.25s ease;
    flex-shrink:0;outline:none;
    ${!opts.disabled ? "" : "cursor:not-allowed;"}
  `;
  // Focus ring
  track.addEventListener("focus", () => {
    if (!opts.disabled) track.style.boxShadow = `0 0 0 3px ${colors.activeBg}33`;
  });
  track.addEventListener("blur", () => {
    track.style.boxShadow = "";
  });

  // Thumb
  const thumb = document.createElement("span");
  thumb.style.cssText = `
    display:flex;align-items:center;justify-content:center;
    width:${sz.thumbSize}px;height:${sz.thumbSize}px;border-radius:50%;
    background:${colors.thumbColor};color:${colors.activeBg};
    font-size:${sz.fontSize}px;font-weight:700;
    box-shadow:0 1px 3px rgba(0,0,0,0.15);
    transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform:translateX(${opts.checked ? sz.width - sz.thumbSize - 4 : 0}px);
    flex-shrink:0;user-select:none;line-height:1;
  `;

  // Inner label
  if (opts.showLabelInside) {
    thumb.textContent = opts.checked ? opts.onLabel : opts.offLabel;
  }

  track.appendChild(thumb);

  // Hidden input
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = opts.name;
  input.checked = opts.checked;
  input.disabled = opts.disabled;
  input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
  wrapper.appendChild(input);

  // Loading spinner overlay
  let spinnerEl: HTMLElement | null = null;

  function updateLoading(): void {
    if (opts.loading && !spinnerEl) {
      spinnerEl = document.createElement("span");
      spinnerEl.innerHTML = `<svg width="${sz.thumbSize - 4}" height="${sz.thumbSize - 4}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" style="animation:spin-switch 0.8s linear infinite;"><circle cx="12" cy="12" r="9"/></svg>`;
      spinnerEl.style.cssText = "position:absolute;display:flex;align-items:center;justify-content:center;";
      thumb.appendChild(spinnerEl);
      // Inject spin keyframe
      if (!document.getElementById("switch-spin-style")) {
        const s = document.createElement("style");
        s.id = "switch-spin-style";
        s.textContent = "@keyframes spin-switch{to{transform:rotate(360deg);}}";
        document.head.appendChild(s);
      }
    } else if (!opts.loading && spinnerEl) {
      spinnerEl.remove();
      spinnerEl = null;
    }
  }

  // Label area
  if (opts.label || opts.description) {
    const labelArea = document.createElement("span");
    labelArea.style.cssText = "display:flex;flex-direction:column;";

    if (opts.label) {
      const labelText = document.createElement("span");
      labelText.textContent = opts.label;
      labelText.style.cssText = `font-size:14px;font-weight:500;color:#111827;line-height:1.3;${opts.disabled ? "opacity:0.6;" : ""}`;
      labelArea.appendChild(labelText);
    }

    if (opts.description) {
      const descText = document.createElement("span");
      descText.textContent = opts.description;
      descText.style.cssText = "font-size:12px;color:#6b7280;margin-top:1px;line-height:1.3;";
      labelArea.appendChild(descText);
    }

    wrapper.appendChild(labelArea);
  }

  wrapper.appendChild(track);

  // --- Interaction ---

  function handleToggle(): void {
    if (opts.disabled || opts.loading) return;
    opts.checked = !opts.checked;
    renderState();
    opts.onChange?.(opts.checked);
  }

  track.addEventListener("click", (e) => {
    e.preventDefault();
    handleToggle();
  });

  // Keyboard: Space toggles
  track.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  });

  // --- Render State ---

  function renderState(): void {
    input.checked = opts.checked;
    track.setAttribute("aria-checked", String(opts.checked));

    // Track color
    track.style.background = opts.checked ? colors.activeBg : colors.inactiveBg;
    track.style.borderColor = opts.checked ? colors.activeBorder : colors.inactiveBorder;

    // Thumb position
    const translateX = opts.checked ? sz.width - sz.thumbSize - 4 : 0;
    thumb.style.transform = `translateX(${translateX}px)`;

    // Inner label
    if (opts.showLabelInside) {
      thumb.textContent = opts.checked ? opts.onLabel : opts.offLabel;
      if (spinnerEl) {
        thumb.appendChild(spinnerEl);
      }
    }

    updateLoading();
  }

  // Initial render
  renderState();

  // --- Instance API ---

  const instance: SwitchInstance = {
    element: wrapper,

    isChecked() { return opts.checked; },

    setChecked(checked: boolean) {
      opts.checked = checked;
      renderState();
    },

    toggle() {
      if (!opts.disabled && !opts.loading) {
        handleToggle();
      }
    },

    disable() {
      opts.disabled = true;
      input.disabled = true;
      track.setAttribute("aria-disabled", "true");
      wrapper.style.opacity = "0.5";
      wrapper.style.cursor = "not-allowed";
      track.style.cursor = "not-allowed";
    },

    enable() {
      opts.disabled = false;
      input.disabled = false;
      track.removeAttribute("aria-disabled");
      wrapper.style.opacity = "";
      wrapper.style.cursor = "";
      track.style.cursor = "";
    },

    setLoading(loading: boolean) {
      opts.loading = loading;
      renderState();
    },

    destroy() {
      wrapper.remove();
    },
  };

  return instance;
}

// --- Convenience: Labeled Switch Row ---

export interface LabeledSwitchOptions extends Omit<SwitchOptions, "container"> {
  container: HTMLElement | string;
  /** Label shown to the left of the switch */
  label: string;
  /** Description below label */
  description?: string;
  /** Align label: left or right of switch */
  labelPosition?: "left" | "right";
}

export function createLabeledSwitch(options: LabeledSwitchOptions): SwitchInstance {
  return createSwitch({
    ...options,
    label: options.label,
    description: options.description,
  });
}
