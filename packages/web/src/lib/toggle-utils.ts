/**
 * Toggle Utilities: Individual toggle components including toggle button,
 * icon toggle, press-and-hold toggle, and toggle with loading state.
 */

// --- Types ---

export type ToggleSize = "sm" | "md" | "lg";
export type ToggleVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline";

export interface ToggleButtonOptions {
  /** Initially pressed/on */
  pressed?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: ToggleSize;
  /** Color variant */
  variant?: ToggleVariant;
  /** Button label text */
  label?: string;
  /** Icon HTML string (shown when off) */
  icon?: string;
  /** Icon shown when on/toggled */
  activeIcon?: string;
  /** Show pressed indicator dot */
  showIndicator?: boolean;
  /** Called on toggle */
  onChange?: (pressed: boolean) => void;
  /** Custom class name */
  className?: string;
}

export interface IconToggleOptions {
  /** Icon when off */
  offIcon: string;
  /** Icon when on */
  onIcon: string;
  /** Initially toggled? */
  value?: boolean;
  /** Size in px */
  size?: number;
  /** Color when active */
  activeColor?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Disabled */
  disabled?: boolean;
  /** Called on change */
  onChange?: (value: boolean) => void;
  /** Custom class name */
  className?: string;
}

export interface PressHoldToggleOptions {
  /** Label text */
  label: string;
  /** Hold duration in ms (default 500) */
  holdDuration?: number;
  /** Size variant */
  size?: ToggleSize;
  /** Color variant */
  variant?: ToggleVariant;
  /** Called when hold completes */
  onActivate: () => void;
  /** Called when released early */
  onCancel?: () => void;
  /** Progress callback during hold (0-1) */
  onProgress?: (progress: number) => void;
  /** Custom class name */
  className?: string;
}

export interface LoadingToggleOptions {
  /** Label text */
  label: string;
  /** Loading state */
  loading?: boolean;
  /** Checked/toggle state */
  checked?: boolean;
  /** Size variant */
  size?: ToggleSize;
  /** Called on change (ignored during loading) */
  onChange?: (checked: boolean) => void;
  /** Custom class name */
  className?: string;
}

// --- Variant Styles ---

const VARIANT_MAP: Record<ToggleVariant, { bg: string; border: string; color: string; activeBg: string; activeBorder: string; activeColor: string }> = {
  "default": { bg: "#fff", border: "#d1d5db", color: "#374151", activeBg: "#eff6ff", activeBorder: "#93c5fd", activeColor: "#2563eb" },
  "primary": { bg: "#fff", border: "#3b82f6", color: "#3b82f6", activeBg: "#3b82f6", activeBorder: "#3b82f6", activeColor: "#fff" },
  "success": { bg: "#fff", border: "#22c55e", color: "#16a34a", activeBg: "#22c55e", activeBorder: "#22c55e", activeColor: "#fff" },
  "warning": { bg: "#fff", border: "#f59e0b", color: "#d97706", activeBg: "#f59e0b", activeBorder: "#f59e0b", activeColor: "#fff" },
  "danger": { bg: "#fff", border: "#ef4444", color: "#dc2626", activeBg: "#ef4444", activeBorder: "#ef4444", activeColor: "#fff" },
  "outline": { bg: "transparent", border: "#d1d5db", color: "#6b7280", activeBg: "transparent", activeBorder: "#3b82f6", activeColor: "#3b82f6" },
};

const SIZE_PADDING: Record<ToggleSize, { padding: string; fontSize: string; height: string }> = {
  "sm": { padding: "4px 10px", fontSize: "12px", height: "28px" },
  "md": { padding: "6px 14px", fontSize: "13px", height: "34px" },
  "lg": { padding: "8px 18px", fontSize: "14px", height: "40px" },
};

// --- Toggle Button ---

/**
 * Create a toggle button (pressable button that stays pressed).
 *
 * @example
 * ```ts
 * const btn = createToggleButton({
 *   label: "Bold",
 *   pressed: false,
 *   onChange: (p) => toggleBold(p),
 * });
 * ```
 */
export function createToggleButton(options: ToggleButtonOptions = {}): HTMLElement {
  const {
    pressed = false,
    disabled = false,
    size = "md",
    variant = "default",
    label,
    icon,
    activeIcon,
    showIndicator = false,
    onChange,
    className,
  } = options;

  let _pressed = pressed;
  const vm = VARIANT_MAP[variant];
  const sp = SIZE_PADDING[size];

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `toggle-btn ${size} ${variant} ${className ?? ""}`.trim();
  btn.setAttribute("aria-pressed", String(_pressed));

  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: sp.padding,
    fontSize: sp.fontSize,
    fontWeight: "500",
    lineHeight: "1",
    height: sp.height,
    borderRadius: "8px",
    border: "1px solid",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "all 0.15s ease",
    outline: "none",
    fontFamily: "inherit",
    ...(disabled ? { opacity: "0.5", pointerEvents: "none" } : {}),
    ...(_pressed ? {
      background: vm.activeBg,
      borderColor: vm.activeBorder,
      color: vm.activeColor,
    } : {
      background: vm.bg,
      borderColor: vm.border,
      color: vm.color,
    }),
  });

  // Icon
  if (icon || activeIcon) {
    const iconSpan = document.createElement("span");
    iconSpan.innerHTML = _pressed ? (activeIcon ?? icon ?? "") : (icon ?? "");
    iconSpan.style.cssText = "display:inline-flex;align-items:center;line-height:1;";
    btn.appendChild(iconSpan);
  }

  // Label
  if (label) {
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    btn.appendChild(labelEl);
  }

  // Indicator dot
  if (showIndicator && _pressed) {
    const dot = document.createElement("span");
    dot.style.cssText =
      "width:6px;height:6px;border-radius:50%;background:currentColor;" +
      "flex-shrink:0;";
    btn.appendChild(dot);
  }

  // Click handler
  btn.addEventListener("click", () => {
    if (disabled) return;
    _pressed = !_pressed;
    btn.setAttribute("aria-pressed", String(_pressed));
    Object.assign(btn.style, _pressed ? {
      background: vm.activeBg,
      borderColor: vm.activeBorder,
      color: vm.activeColor,
    } : {
      background: vm.bg,
      borderColor: vm.border,
      color: vm.color,
    });

    // Update icon
    if (icon || activeIcon) {
      const iconEl = btn.querySelector("span:first-child") as HTMLElement;
      if (iconEl) iconEl.innerHTML = _pressed ? (activeIcon ?? icon ?? "") : (icon ?? "");
    }
    onChange?.(_pressed);
  });

  return btn;
}

// --- Icon Toggle ---

/**
 * Create an icon-only toggle (like a favorite/heart button).
 *
 * @example
 * ```ts
 * const fav = createIconToggle({
 *   offIcon: "&#9825;",
 *   onIcon: "&#10084;",
 *   size: 28,
 *   onChange: (v) => setFavorite(v),
 * });
 * ```
 */
export function createIconToggle(options: IconToggleOptions): HTMLElement {
  const {
    offIcon,
    onIcon,
    value = false,
    size = 24,
    activeColor = "#ef4444",
    tooltip,
    disabled = false,
    onChange,
    className,
  } = options;

  let _value = value;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `icon-toggle ${className ?? ""}`.trim();
  btn.setAttribute("aria-pressed", String(_value));
  if (tooltip) btn.title = tooltip;

  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    border: "none",
    background: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: `${Math.round(size * 0.65)}px`,
    color: _value ? activeColor : "#9ca3af",
    transition: "color 0.2s ease, transform 0.15s ease",
    outline: "none",
    padding: "0",
    lineHeight: "1",
    ...(disabled ? { opacity: "0.5", pointerEvents: "none" } : {}),
  });

  btn.innerHTML = _value ? onIcon : offIcon;

  btn.addEventListener("click", () => {
    if (disabled) return;
    _value = !_value;
    btn.setAttribute("aria-pressed", String(_value));
    btn.innerHTML = _value ? onIcon : offIcon;
    btn.style.color = _value ? activeColor : "#9ca3af";
    btn.style.transform = _value ? "scale(1.15)" : "scale(1)";
    setTimeout(() => { btn.style.transform = ""; }, 150);
    onChange?.(_value);
  });

  // Hover effect
  if (!disabled) {
    btn.addEventListener("mouseenter", () => { btn.style.color = _value ? activeColor : "#6b7280"; });
    btn.addEventListener("mouseleave", () => { btn.style.color = _value ? activeColor : "#9ca3af"; });
  }

  return btn;
}

// --- Press & Hold Toggle ---

/**
 * Create a press-and-hold toggle button.
 *
 * @example
 * ```ts
 * const holdBtn = createPressHoldToggle({
 *   label: "Hold to delete",
 *   holdDuration: 2000,
 *   onActivate: () => deleteItem(),
 * });
 * ```
 */
export function createPressHoldToggle(options: PressHoldToggleOptions): HTMLElement {
  const {
    label,
    holdDuration = 500,
    size = "md",
    variant = "danger",
    onActivate,
    onCancel,
    onProgress,
    className,
  } = options;

  let holding = false;
  let startTime = 0;
  let animFrame: number | null = null;

  const vm = VARIANT_MAP[variant];
  const sp = SIZE_PADDING[size];

  const wrapper = document.createElement("div");
  wrapper.className = `press-hold-toggle ${className ?? ""}`.trim();

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;

  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: sp.padding,
    fontSize: sp.fontSize,
    fontWeight: "600",
    height: sp.height,
    borderRadius: "8px",
    border: "1px solid transparent",
    background: vm.bg,
    color: vm.color,
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    transition: "background 0.15s",
    outline: "none",
    fontFamily: "inherit",
    userSelect: "none",
  });

  // Progress bar overlay
  const progressEl = document.createElement("div");
  progressEl.className = "hold-progress";
  Object.assign(progressEl.style, {
    position: "absolute",
    left: "0",
    bottom: "0",
    height: "3px",
    width: "0%",
    background: vm.activeColor,
    transition: "width 0.05s linear",
    borderRadius: "0 0 8px 8px",
  });

  btn.appendChild(progressEl);
  wrapper.appendChild(btn);

  function startHold(e: Event): void {
    e.preventDefault();
    holding = true;
    startTime = Date.now();

    const tick = (): void => {
      if (!holding) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / holdDuration, 1);
      progressEl.style.width = `${progress * 100}%`;
      onProgress?.(progress);

      if (progress >= 1) {
        holding = false;
        progressEl.style.width = "0%";
        btn.style.background = vm.activeBg;
        btn.style.color = vm.activeColor;
        setTimeout(() => {
          btn.style.background = vm.bg;
          btn.style.color = vm.color;
        }, 300);
        onActivate?.();
        return;
      }
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
  }

  function endHold(): void {
    if (!holding) return;
    holding = false;
    if (animFrame !== null) cancelAnimationFrame(animFrame);
    animFrame = null;
    progressEl.style.width = "0%";
    onCancel?.();
  }

  btn.addEventListener("mousedown", startHold);
  btn.addEventListener("mouseup", endHold);
  btn.addEventListener("mouseleave", endHold);
  btn.addEventListener("touchstart", startHold, { passive: true });
  btn.addEventListener("touchend", endHold);
  btn.addEventListener("touchcancel", endHold);

  return wrapper;
}

// --- Loading Toggle ---

/**
 * Create a toggle that shows a spinner while processing.
 *
 * @example
 * ```ts
 * const lt = createLoadingToggle({
 *   label: "Auto-save",
 *   checked: true,
 *   loading: false,
 *   onChange: async (v) => {
 *     lt.setLoading(true);
 *     await save(v);
 *     lt.setLoading(false);
 *   },
 * });
 * ```
 */
export function createLoadingToggle(options: LoadingToggleOptions): HTMLElement & { setLoading: (loading: boolean) => void; setChecked: (checked: boolean) => void } {
  const {
    label,
    loading = false,
    checked = false,
    size = "md",
    onChange,
    className,
  } = options;

  let _loading = loading;
  let _checked = checked;

  const root = document.createElement("label");
  root.className = `loading-toggle ${size} ${className ?? ""}`.trim();
  root.style.cssText = "display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;";

  // Track + thumb
  const trackSize = size === "sm" ? 18 : size === "lg" ? 30 : 24;
  const thumbSize = size === "sm" ? 14 : size === "lg" ? 26 : 20;

  const track = document.createElement("div");
  track.style.cssText =
    `position:relative;width:${trackSize * 1.8}px;height:${trackSize}px;border-radius:${trackSize / 2}px;` +
    `background:${_checked ? "#3b82f6" : "#d1d5db"};transition:background 0.2s;flex-shrink:0;`;

  if (_loading) {
    const spinner = document.createElement("div");
    spinner.style.cssText =
      `position:absolute;top:${(trackSize - thumbSize) / 2}px;left:${(trackSize * 1.8 - thumbSize) / 2 - 2}px;` +
      `width:${thumbSize}px;height:${thumbSize}px;border:2px solid #fff;border-top-color:transparent;` +
      "border-radius:50%;animation:spin 0.6s linear infinite;";
    track.appendChild(spinner);
  } else {
    const thumb = document.createElement("div");
    thumb.style.cssText =
      `position:absolute;top:${(trackSize - thumbSize) / 2}px;` +
      `${_checked ? `left:${trackSize * 1.8 - thumbSize - 2}px` : "left:2px"};` +
      `width:${thumbSize}px;height:${thumbSize}px;border-radius:50%;background:#fff;` +
      "box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:left 0.2s;";
    track.appendChild(thumb);
  }

  root.appendChild(track);

  // Label
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  labelEl.style.fontSize = size === "sm" ? "11px" : size === "lg" ? "14px" : "12px";
  labelEl.style.fontWeight = "500";
  labelEl.style.color = "#374151";
  labelEl.style.opacity = _loading ? "0.6" : "1";
  root.appendChild(labelEl);

  function setLoading(l: boolean): void {
    _loading = l;
    labelEl.style.opacity = l ? "0.6" : "1";
    track.innerHTML = "";
    if (l) {
      const spinner = document.createElement("div");
      spinner.style.cssText =
        `position:absolute;top:${(trackSize - thumbSize) / 2}px;left:${(trackSize * 1.8 - thumbSize) / 2 - 2}px;` +
        `width:${thumbSize}px;height:${thumbSize}px;border:2px solid #fff;border-top-color:transparent;` +
        "border-radius:50%;animation:spin 0.6s linear infinite;";
      track.appendChild(spinner);
    } else {
      const thumb = document.createElement("div");
      thumb.style.cssText =
        `position:absolute;top:${(trackSize - thumbSize) / 2}px;` +
        `${_checked ? `left:${trackSize * 1.8 - thumbSize - 2}px` : "left:2px"};` +
        `width:${thumbSize}px;height:${thumbSize}px;border-radius:50%;background:#fff;` +
        "box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:left 0.2s;";
      track.appendChild(thumb);
    }
  }

  function setChecked(c: boolean): void {
    _checked = c;
    track.style.background = c ? "#3b82f6" : "#d1d5db";
    if (!_loading) {
      const thumb = track.querySelector("div") as HTMLElement;
      if (thumb) thumb.style.left = c ? `${trackSize * 1.8 - thumbSize - 2}px` : "2px";
    }
  }

  root.addEventListener("click", () => {
    if (_loading) return;
    _checked = !_checked;
    setChecked(_checked);
    onChange?.(_checked);
  });

  // Inject spin keyframe
  if (!document.getElementById("spin-keyframe")) {
    const style = document.createElement("style");
    style.id = "spin-keyframe";
    style.textContent = "@keyframes spin{to{transform:rotate(360deg);}}";
    document.head.appendChild(style);
  }

  return Object.assign(root, { setLoading, setChecked });
}
