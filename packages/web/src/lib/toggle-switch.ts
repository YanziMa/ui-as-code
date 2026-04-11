/**
 * Toggle Switch: Accessible toggle/switch component with multiple sizes,
 * variants (default/success/warning/danger), labels, descriptions,
 * keyboard navigation, animated transitions, disabled state,
 * loading state, and ARIA attributes.
 */

// --- Types ---

export type ToggleVariant = "default" | "success" | "warning" | "danger";
export type ToggleSize = "sm" | "md" | "lg";

export interface ToggleOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial checked state */
  checked?: boolean;
  /** Visual variant */
  variant?: ToggleVariant;
  /** Size variant */
  size?: ToggleSize;
  /** Label text (shown beside switch) */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Show "On"/"Off" text inside thumb */
  showLabelInside?: boolean;
  /** Custom "On" label text */
  onLabel?: string;
  /** Custom "Off" label text */
  offLabel?: string;
  /** Custom active color (overrides variant) */
  activeColor?: string;
  /** Custom inactive color */
  inactiveColor?: string;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Callback on toggle change */
  onChange?: (checked: boolean) => void;
  /** Callback before change (return false to prevent) */
  beforeChange?: (checked: boolean) => boolean | void;
  /** Custom CSS class */
  className?: string;
}

export interface ToggleInstance {
  element: HTMLElement;
  isChecked: () => boolean;
  setChecked: (checked: boolean) => void;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  setLoading: (loading: boolean) => void;
  destroy: () => void;
}

// --- Variant Colors ---

const VARIANT_COLORS: Record<ToggleVariant, { active: string; trackActive: string }> = {
  default:   { active: "#ffffff", trackActive: "#6366f1" },
  success:   { active: "#ffffff", trackActive: "#22c55e" },
  warning:   { active: "#ffffff", trackActive: "#f59e0b" },
  danger:    { active: "#ffffff", trackActive: "#ef4444" },
};

const SIZE_CONFIG: Record<ToggleSize, {
  width: number;
  height: number;
  thumbSize: number;
  fontSize: number;
  padding: number;
}> = {
  sm:  { width: 34,  height: 18,  thumbSize: 14, fontSize: 8,  padding: 2 },
  md:  { width: 44,  height: 24,  thumbSize: 20, fontSize: 9,  padding: 2 },
  lg:  { width: 56,  height: 30,  thumbSize: 26, fontSize: 10, padding: 3 },
};

// --- Main Class ---

export class ToggleManager {
  create(options: ToggleOptions): ToggleInstance {
    const opts = {
      checked: options.checked ?? false,
      variant: options.variant ?? "default",
      size: options.size ?? "md",
      disabled: options.disabled ?? false,
      loading: options.loading ?? false,
      showLabelInside: options.showLabelInside ?? false,
      onLabel: options.onLabel ?? "ON",
      offLabel: options.offLabel ?? "OFF",
      animationDuration: options.animationDuration ?? 200,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ToggleSwitch: container element not found");

    const sz = SIZE_CONFIG[opts.size];
    const colors = opts.activeColor
      ? { active: "#ffffff", trackActive: opts.activeColor }
      : VARIANT_COLORS[opts.variant];
    const inactiveTrack = opts.inactiveColor ?? "#d1d5db";

    container.className = `toggle-switch toggle-${opts.size} toggle-${opts.variant} ${opts.className ?? ""}`;
    container.style.cssText = `
      display:inline-flex;align-items:center;gap:10px;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
      cursor:${opts.disabled ? "not-allowed" : "default"};
      font-family:-apple-system,sans-serif;
    `;

    // Switch track + thumb wrapper
    const switchWrapper = document.createElement("label");
    switchWrapper.className = "toggle-wrapper";
    switchWrapper.style.cssText = `
      position:relative;display:inline-block;
      width:${sz.width}px;height:${sz.height}px;
      cursor:${opts.disabled ? "not-allowed" : "pointer"};
      flex-shrink:0;
    `;

    // Hidden native input for accessibility
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "toggle-input";
    input.checked = opts.checked;
    input.disabled = opts.disabled || opts.loading;
    input.setAttribute("aria-checked", String(opts.checked));
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
    switchWrapper.appendChild(input);

    // Track
    const track = document.createElement("div");
    track.className = "toggle-track";
    track.style.cssText = `
      position:absolute;inset:0;border-radius:${sz.height / 2}px;
      background:${inactiveTrack};transition:background ${opts.animationDuration}ms ease;
    `;
    switchWrapper.appendChild(track);

    // Thumb
    const thumb = document.createElement("div");
    thumb.className = "toggle-thumb";
    const thumbOffset = sz.width - sz.thumbSize - sz.padding * 2;
    thumb.style.cssText = `
      position:absolute;top:${sz.padding}px;left:${sz.padding}px;
      width:${sz.thumbSize}px;height:${sz.thumbSize}px;
      border-radius:50%;background:#fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.2),0 1px 2px rgba(0,0,0,0.12);
      transition:transform ${opts.animationDuration}ms ease, background ${opts.animationDuration}ms ease;
      transform:translateX(${opts.checked ? `${thumbOffset}px` : "0"});
      display:flex;align-items:center;justify-content:center;
    `;
    switchWrapper.appendChild(thumb);

    // Inner label (ON/OFF text inside thumb)
    if (opts.showLabelInside) {
      const innerLabel = document.createElement("span");
      innerLabel.className = "toggle-inner-label";
      innerLabel.style.cssText = `
        font-size:${sz.fontSize}px;font-weight:700;color:${opts.checked ? colors.trackActive : "#9ca3af"};
        transition:color ${opts.animationDuration}ms ease;
        pointer-events:none;line-height:1;
        user-select:none;
      `;
      innerLabel.textContent = opts.checked ? opts.onLabel : opts.offLabel;
      thumb.appendChild(innerLabel);
    }

    // Loading spinner overlay
    let spinnerEl: HTMLSpanElement | null = null;
    if (opts.loading) {
      spinnerEl = this.createSpinner(sz.thumbSize);
      thumb.appendChild(spinnerEl);
    }

    container.appendChild(switchWrapper);

    // Label area (beside switch)
    if (opts.label || opts.description) {
      const labelArea = document.createElement("div");
      labelArea.className = "toggle-label-area";
      labelArea.style.cssText = "display:flex;flex-direction:column;gap:2px;";

      if (opts.label) {
        const labelText = document.createElement("span");
        labelText.className = "toggle-label-text";
        labelText.style.cssText = `font-size:14px;font-weight:500;color:#111827;line-height:1.3;`;
        labelText.textContent = opts.label;
        labelArea.appendChild(labelText);
      }

      if (opts.description) {
        const descText = document.createElement("span");
        descText.className = "toggle-description";
        descText.style.cssText = "font-size:12px;color:#6b7280;line-height:1.3;";
        descText.textContent = opts.description;
        labelArea.appendChild(descText);
      }

      container.appendChild(labelArea);
    }

    // State
    let isChecked = opts.checked;
    let destroyed = false;

    function updateVisuals(animate = true): void {
      const duration = animate ? opts.animationDuration : 0;
      track.style.transition = `background ${duration}ms ease`;
      thumb.style.transition = `transform ${duration}ms ease, background ${duration}ms ease`;

      if (isChecked) {
        track.style.background = colors.trackActive;
        thumb.style.transform = `translateX(${thumbOffset}px)`;
      } else {
        track.style.background = inactiveTrack;
        thumb.style.transform = "translateX(0)";
      }

      // Update inner label color
      const innerLabel = thumb.querySelector(".toggle-inner-label") as HTMLSpanElement | null;
      if (innerLabel) {
        innerLabel.style.color = isChecked ? colors.trackActive : "#9ca3af";
        innerLabel.textContent = isChecked ? opts.onLabel : opts.offLabel;
      }

      input.checked = isChecked;
      input.setAttribute("aria-checked", String(isChecked));
    }

    function handleToggle(): void {
      if (opts.disabled || opts.loading) return;
      if (opts.beforeChange?.(!isChecked) === false) return;

      isChecked = !isChecked;
      updateVisuals(true);
      opts.onChange?.(isChecked);
    }

    // Click handler on wrapper
    switchWrapper.addEventListener("click", (e) => {
      e.preventDefault();
      handleToggle();
    });

    // Keyboard support via hidden input
    input.addEventListener("change", () => {
      if (input.checked !== isChecked) {
        isChecked = input.checked;
        updateVisuals(true);
        opts.onChange?.(isChecked);
      }
    });

    // Space/Enter on container
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !opts.disabled && !opts.loading) {
        e.preventDefault();
        handleToggle();
      }
    });

    // Initial render
    updateVisuals(false);

    const instance: ToggleInstance = {
      element: container,

      isChecked() { return isChecked; },

      setChecked(checked: boolean) {
        isChecked = checked;
        updateVisuals(true);
      },

      toggle() {
        handleToggle();
      },

      enable() {
        opts.disabled = false;
        container.style.opacity = "";
        container.style.pointerEvents = "";
        container.style.cursor = "default";
        switchWrapper.style.cursor = "pointer";
        input.disabled = false;
      },

      disable() {
        opts.disabled = true;
        container.style.opacity = "0.5";
        container.style.pointerEvents = "none";
        container.style.cursor = "not-allowed";
        switchWrapper.style.cursor = "not-allowed";
        input.disabled = true;
      },

      setLoading(loading: boolean) {
        opts.loading = loading;
        input.disabled = opts.disabled || loading;

        if (loading && !spinnerEl) {
          spinnerEl = this.createSpinner(sz.thumbSize);
          thumb.appendChild(spinnerEl);
        } else if (!loading && spinnerEl) {
          spinnerEl.remove();
          spinnerEl = null;
        }
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }

  private createSpinner(size: number): HTMLSpanElement {
    const spinner = document.createElement("span");
    spinner.className = "toggle-spinner";
    spinner.style.cssText = `
      position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    `;
    const dot = document.createElement("span");
    dot.style.cssText = `
      width:${Math.max(size * 0.35, 6)}px;height:${Math.max(size * 0.35, 6)}px;
      border-radius:50%;background:${"#6366f1"};
      animation:toggleSpin 0.8s linear infinite;
    `;
    spinner.appendChild(dot);

    // Inject keyframe if not present
    if (!document.getElementById("toggle-spin-styles")) {
      const style = document.createElement("style");
      style.id = "toggle-spin-styles";
      style.textContent = "@keyframes toggleSpin{0%{opacity:1;}50%{opacity:0.3;}100%{opacity:1;}}";
      document.head.appendChild(style);
    }

    return spinner;
  }
}

/** Convenience: create a toggle switch */
export function createToggle(options: ToggleOptions): ToggleInstance {
  return new ToggleManager().create(options);
}
