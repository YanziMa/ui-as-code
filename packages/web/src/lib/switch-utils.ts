/**
 * Switch Utilities: Toggle switch component with multiple sizes,
 * labeled variants, loading state, confirmation dialog, ARIA switch role,
 * and animated transitions.
 */

// --- Types ---

export type SwitchSize = "sm" | "md" | "lg";
export type SwitchVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface SwitchOptions {
  /** Name attribute */
  name?: string;
  /** Checked/active state */
  checked?: boolean;
  /** Label text (shown beside switch) */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Size variant */
  size?: SwitchSize;
  /** Color variant */
  variant?: SwitchVariant;
  /** Disabled? */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Require confirmation before toggling off? */
  confirmOff?: boolean | string; // true = default message, string = custom message
  /** Custom labels for on/off states */
  labelChecked?: string;
  labelUnchecked?: string;
  /** Show on/off text inside the thumb? */
  showThumbLabel?: boolean;
  /** On change callback */
  onChange?: (checked: boolean) => void | Promise<void>;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface SwitchInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** The native <input type="checkbox"> element */
  inputEl: HTMLInputElement;
  /** Get checked state */
  isChecked(): boolean;
  /** Set checked state programmatically */
  setChecked(checked: boolean): void;
  /** Toggle the switch */
  toggle(): void;
  /** Set loading state */
  setLoading(loading: boolean): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Focus the switch */
  focus(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const SWITCH_SIZES: Record<SwitchSize, { width: string; height: string; thumbSize: string; translateX: string }> = {
  "sm": { width: "32px", height: "18px", thumbSize: "14px", translateX: "14px" },
  "md": { width: "40px", height: "22px", thumbSize: "18px", translateX: "18px" },
  "lg": { width: "50px", height: "28px", thumbSize: "24px", translateX: "22px" },
};

// --- Variant Colors ---

const SWITCH_VARIANTS: Record<SwitchVariant, { activeBg: string; activeBorder: string }> = {
  "default": { activeBg: "#374151", activeBorder: "#374151" },
  "primary": { activeBg: "#3b82f6", activeBorder: "#3b82f6" },
  "success": { activeBg: "#22c55e", activeBorder: "#22c55e" },
  "warning": { activeBg: "#f59e0b", activeBorder: "#f59e0b" },
  "danger": { activeBg: "#ef4444", activeBorder: "#ef4444" },
};

// --- Core Factory ---

/**
 * Create a toggle switch component.
 *
 * @example
 * ```ts
 * const sw = createSwitch({
 *   label: "Dark mode",
 *   checked: false,
 *   variant: "primary",
 *   onChange: (v) => console.log(v),
 * });
 * ```
 */
export function createSwitch(options: SwitchOptions = {}): SwitchInstance {
  const {
    name,
    checked = false,
    label,
    description,
    size = "md",
    variant = "default",
    disabled = false,
    loading = false,
    confirmOff = false,
    labelChecked,
    labelUnchecked,
    showThumbLabel = false,
    onChange,
    className,
    container,
  } = options;

  let _checked = checked;
  let _loading = loading;

  const sc = SWITCH_SIZES[size];
  const vc = SWITCH_VARIANTS[variant];

  // Root
  const root = document.createElement("label");
  root.className = `switch-wrapper ${size} ${variant} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;align-items:center;gap:10px;" +
    "cursor:" + (disabled ? "not-allowed" : "pointer") + ";" +
    "user-select:none;" + (disabled ? "opacity:0.5;" : "");

  // Hidden native input
  const inputEl = document.createElement("input");
  inputEl.type = "checkbox";
  inputEl.name = name ?? "";
  inputEl.checked = _checked;
  inputEl.disabled = disabled;
  inputEl.setAttribute("role", "switch");
  inputEl.setAttribute("aria-checked", String(_checked));
  inputEl.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";

  root.appendChild(inputEl);

  // Track + Thumb container
  const track = document.createElement("span");
  track.className = "switch-track";
  track.style.cssText =
    `position:relative;display:inline-block;width:${sc.width};height:${sc.height};` +
    "flex-shrink:0;border-radius:" + sc.height + ";" +
    "background:#d1d5db;border:none;cursor:pointer;" +
    "transition:background-color 0.2s ease, border-color 0.2s ease;";

  // Thumb
  const thumb = document.createElement("span");
  thumb.className = "switch-thumb";
  thumb.style.cssText =
    `position:absolute;top:${(parseInt(sc.height) - parseInt(sc.thumbSize)) / 2}px;left:${(parseInt(sc.height) - parseInt(sc.thumbSize)) / 2}px;` +
    `width:${sc.thumbSize};height:${sc.thumbSize};` +
    "border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.15);" +
    "transition:transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);";

  // Thumb label (on/off inside thumb)
  if (showThumbLabel) {
    const thumbLabel = document.createElement("span");
    thumbLabel.className = "switch-thumb-label";
    thumbLabel.style.cssText =
      "font-size:9px;font-weight:700;line-height:1;display:flex;" +
      "align-items:center;justify-content:center;width:100%;height:100%;" +
      "color:#6b7280;";
    thumbLabel.textContent = _checked ? (labelChecked || "") : (labelUnchecked || "");
    thumb.appendChild(thumbLabel);
  }

  // Loading spinner overlay
  const spinner = document.createElement("span");
  spinner.innerHTML = "&#9201;";
  spinner.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
    "color:#fff;font-size:" + sc.thumbSize + ";animation:spin 1s linear infinite;" +
    "opacity:0;transition:opacity 0.15s;z-index:1;pointer-events:none;";
  track.appendChild(spinner);
  track.appendChild(thumb);
  root.appendChild(track);

  // Label area
  if (label || description) {
    const labelArea = document.createElement("div");
    labelArea.className = "switch-label-area";
    labelArea.style.display = "flex";
    labelArea.style.flexDirection = "column";
    labelArea.style.gap = "1px";

    if (label) {
      const labelEl = document.createElement("span");
      labelEl.className = "switch-label";
      labelEl.textContent = label;
      labelEl.style.cssText = "font-size:14px;font-weight:400;color:#374151;line-height:1.3;";
      labelArea.appendChild(labelEl);
    }

    if (description) {
      const descEl = document.createElement("span");
      descEl.className = "switch-description";
      descEl.textContent = description;
      descEl.style.cssText = "font-size:12px;color:#9ca3af;line-height:1.3;";
      labelArea.appendChild(descEl);
    }

    root.appendChild(labelArea);
  }

  // --- Update Visual State ---

  function updateVisual(): void {
    if (_checked) {
      track.style.background = vc.activeBg;
      track.style.borderColor = vc.activeBorder;
      thumb.style.transform = `translateX(${sc.translateX})`;
    } else {
      track.style.background = "#d1d5db";
      track.style.borderColor = "#d1d5db";
      thumb.style.transform = "translateX(0)";
    }

    spinner.style.opacity = _loading ? "1" : "0";
    inputEl.checked = _checked;
    inputEl.setAttribute("aria-checked", String(_checked));

    if (showThumbLabel) {
      const tl = thumb.querySelector(".switch-thumb-label") as HTMLElement | null;
      if (tl) tl.textContent = _checked ? (labelChecked || "") : (labelUnchecked || "");
    }
  }

  updateVisual();

  // --- Handle Toggle ---

  async function handleToggle(): Promise<void> {
    if (disabled || _loading) return;

    // Confirm-off check
    if (_checked && confirmOff) {
      const msg = typeof confirmOff === "string" ? confirmOff : "Are you sure you want to disable this?";
      if (!confirm(msg)) return;
    }

    _checked = !_checked;
    updateVisual();

    if (onChange) {
      try {
        _loading = true;
        updateVisual();
        await onChange(_checked);
      } finally {
        _loading = false;
        updateVisual();
      }
    }
  }

  // --- Events ---

  root.addEventListener("click", (e) => {
    // Don't toggle if clicking on label area text directly when it's just informational
    handleToggle();
  });

  inputEl.addEventListener("change", () => {
    // Sync native input with internal state
    if (inputEl.checked !== _checked) {
      _checked = inputEl.checked;
      updateVisual();
    }
  });

  // Keyboard support
  root.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  });

  // Hover effect
  if (!disabled) {
    track.addEventListener("mouseenter", () => {
      track.style.filter = "brightness(0.95)";
    });
    track.addEventListener("mouseleave", () => {
      track.style.filter = "";
    });
  }

  // --- Instance ---

  return {
    el: root,
    inputEl,

    isChecked() { return _checked; },

    setChecked(c: boolean) {
      _checked = c;
      updateVisual();
    },

    toggle() { handleToggle(); },

    setLoading(l: boolean) {
      _loading = l;
      updateVisual();
    },

    setDisabled(d: boolean) {
      inputEl.disabled = d;
      root.style.opacity = d ? "0.5" : "1";
      root.style.cursor = d ? "not-allowed" : "pointer";
    },

    focus() { inputEl.focus(); },
    destroy() { root.remove(); },
  };
}
