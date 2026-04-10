/**
 * Rating Input: Advanced star/rating component with customizable icons,
 * half-ratings, hover previews, keyboard support, labels, and validation.
 *
 * Features:
 * - Custom icons (stars, hearts, thumbs, fire, custom SVG/emoji)
 * - Half-star ratings (0.5 increments)
 * - Precise ratings (0.1 increments on click position)
 * - Hover preview with smooth animation
 * - Read-only mode
 * - Clear/reset rating
 * - Accessible (ARIA, keyboard nav)
 * - Size variants
 * - Color customization per state (empty, hover, active)
 */

// --- Types ---

export type RatingIcon = "star" | "heart" | "thumb" | "fire" | "emoji" | "circle" | "diamond" | "custom";
export type RatingSize = "sm" | "md" | "lg" | "xl";

export interface RatingInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Max rating value (default: 5) */
  max?: number;
  /** Initial value (default: 0) */
  value?: number;
  /** Icon type (default: star) */
  icon?: RatingIcon;
  /** Custom icon renderer for "custom" type */
  customIconRenderer?: (index: number, filled: number) => string;
  /** Allow half ratings (default: true) */
  allowHalf?: boolean;
  /** Allow precise ratings (0.1 steps, default: false) */
  allowPrecise?: boolean;
  /** Read-only mode (default: false) */
  readonly?: boolean;
  /** Show clear button (default: true) */
  showClear?: boolean;
  /** Show value label (default: false) */
  showValue?: boolean;
  /** Label text format (e.g., "{value}/5") */
  labelFormat?: string;
  /** Active/filled color (default: #fbbf24) */
  activeColor?: string;
  /** Empty color (default: #d1d5db) */
  emptyColor?: string;
  /** Hover color (default: #f59e0b) */
  hoverColor?: string;
  /** Size variant (default: md) */
  size?: RatingSize;
  /** Gap between icons in px (default: 4) */
  gap?: number;
  /** Animation duration ms (default: 150) */
  animationDuration?: number;
  /** Callback on value change */
  onChange?: (value: number) => void;
  /** Callback on hover (preview value) */
  onHover?: (value: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RatingInputInstance {
  element: HTMLElement;
  /** Get current value */
  getValue: () => number;
  /** Set value programmatically */
  setValue: (value: number) => void;
  /** Reset to 0 */
  reset: () => void;
  /** Get percentage (0-100) */
  getPercentage: () => number;
  /** Destroy instance */
  destroy: () => void;
}

// --- Icon Maps ---

const ICON_MAPS: Record<RatingIcon, { full: string; empty: string; half?: string }> = {
  star:    { full: "\u2605", empty: "\u2606", half: "\u{2BD0}" },
  heart:   { full: "\u2665", empty: "\u2661", half: "\u{1FA9E}" },
  thumb:   { full: "\u{1F44D}", empty: "\u{1F44E}", half: "\u{1FA94}" },
  fire:    { full: "\u{1F525}", empty: "\u{1F525}\uFE0F", half: "\u{1F92A}" },
  emoji:   { full: "\u{1F60D}", empty: "\u{1F610}" },
  circle:  { full: "\u25CF", empty: "\u25CB" },
  diamond: { full: "\u{1F48E}", empty: "\u{1F48E}" },
  custom:  { full: "", empty: "" },
};

const SIZE_STYLES: Record<RatingSize, { iconSize: number; containerHeight: number }> = {
  sm:  { iconSize: 16, containerHeight: 24 },
  md:  { iconSize: 22, containerHeight: 32 },
  lg:  { iconSize: 28, containerHeight: 40 },
  xl:  { iconSize: 36, containerHeight: 52 },
};

// --- Main ---

export function createRatingInput(options: RatingInputOptions): RatingInputInstance {
  const opts = {
    max: 5,
    value: 0,
    icon: "star" as RatingIcon,
    allowHalf: true,
    allowPrecise: false,
    readonly: false,
    showClear: true,
    showValue: false,
    labelFormat: undefined as string | undefined,
    activeColor: "#fbbf24",
    emptyColor: "#d1d5db",
    hoverColor: "#f59e0b",
    size: "md" as RatingSize,
    gap: 4,
    animationDuration: 150,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Rating Input: container not found");

  // Root element
  const root = document.createElement("div");
  root.className = `rating-input ${opts.className ?? ""}`;
  root.setAttribute("role": "slider");
  root.setAttribute("aria-valuemin", "0");
  root.setAttribute("aria-valuemax", String(opts.max));
  root.setAttribute("aria-valuenow", String(opts.value));
  root.setAttribute("tabindex", "0");
  root.style.cssText = `
    display:inline-flex;align-items:center;gap:${opts.gap}px;
    cursor:${opts.readonly ? "default" : "pointer"};
    user-select:none;-webkit-user-select:none;outline:none;
    font-family:-apple-system,sans-serif;
  `;

  // Icons container
  const iconsContainer = document.createElement("div");
  iconsContainer.className = "rating-icons";
  iconsContainer.style.cssText = "display:flex;align-items:center;gap:" + opts.gap + "px;";
  root.appendChild(iconsContainer);

  // Create icon elements
  const iconEls: HTMLSpanElement[] = [];
  const sizeStyle = SIZE_STYLES[opts.size];

  for (let i = 0; i < opts.max; i++) {
    const span = document.createElement("span");
    span.dataset.index = String(i);
    span.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      font-size:${sizeStyle.iconSize}px;line-height:1;
      transition:all ${opts.animationDuration}ms ease;
      color:${opts.emptyColor};cursor:pointer;
      ${!opts.readonly ? "transition:transform 0.1s ease;" : ""}
    `;
    span.textContent = ICON_MAPS[opts.icon].empty;

    if (!opts.readonly) {
      span.addEventListener("mouseenter", () => handleHover(i));
      span.addEventListener("mouseleave", handleLeave);
      span.addEventListener("click", (e) => handleClick(e, i));
    }

    iconsContainer.appendChild(span);
    iconEls.push(span);
  }

  // Value label
  let labelEl: HTMLElement | null = null;
  if (opts.showValue) {
    labelEl = document.createElement("span");
    labelEl.className = "rating-label";
    labelEl.style.cssText = `
      margin-left:8px;font-size:${sizeStyle.iconSize - 4}px;font-weight:600;
      color:#374151;min-width:36px;
    `;
    updateLabel();
    root.appendChild(labelEl);
  }

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.showClear && !opts.readonly) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.title = "Clear rating";
    clearBtn.textContent = "\u00D7";
    clearBtn.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      width:20px;height:20px;border:none;background:none;
      cursor:pointer;border-radius:4px;font-size:14px;color:#9ca3af;
      margin-left:4px;padding:0;opacity:0;transition:opacity 0.15s;
    `;
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setValue(0);
    });
    root.appendChild(clearBtn);

    // Show/hide clear based on value
    updateClearVisibility();
  }

  container.appendChild(root);

  // State
  let currentValue = opts.value;
  let hoverValue: number | null = null;
  let destroyed = false;

  // --- Core Functions ---

  function getDisplayValue(): number {
    return hoverValue ?? currentValue;
  }

  function renderIcons(): void {
    const val = getDisplayValue();

    for (let i = 0; i < opts.max; i++) {
      const el = iconEls[i]!;
      const fillLevel = clamp(val - i, 0, 1);

      if (fillLevel <= 0) {
        el.textContent = getIconForLevel(0);
        el.style.color = opts.emptyColor;
        el.style.transform = "";
      } else if (fillLevel >= 1) {
        el.textContent = getIconForLevel(1);
        el.style.color = opts.activeColor;
        el.style.transform = "scale(1.1)";
      } else {
        // Partial fill
        el.textContent = getIconForLevel(fillLevel);
        el.style.color = opts.activeColor;
        el.style.transform = "";

        // For half-icon rendering with gradient trick
        if (opts.icon !== "custom") {
          el.style.position = "relative";
          el.innerHTML = `<span style="position:absolute;top:0;left:0;width:${fillLevel * 100}%;overflow:hidden;">${getIconForLevel(1)}</span><span style="color:${opts.emptyColor}">${getIconForLevel(0)}</span>`;
        }
      }

      // Hover effect for unfilled icons
      if (hoverValue !== null && i < Math.ceil(hoverValue)) {
        if (fillLevel <= 0) el.style.color = opts.hoverColor;
      }
    }
  }

  function getIconForLevel(level: number): string {
    if (level <= 0) return ICON_MAPS[opts.icon].empty;
    if (level >= 1) return ICON_MAPS[opts.icon].full;
    return ICON_MAPS[opts.icon].half ?? ICON_MAPS[opts.icon].full;
  }

  function updateLabel(): void {
    if (!labelEl) return;
    const fmt = opts.labelFormat ?? "{value}/{max}";
    labelEl.textContent = fmt
      .replace("{value}", String(currentValue))
      .replace("{max}", String(opts.max));
  }

  function updateClearVisibility(): void {
    if (!clearBtn) return;
    clearBtn.style.opacity = currentValue > 0 ? "1" : "0";
    clearBtn.style.cursor = currentValue > 0 ? "pointer" : "default";
  }

  function updateAria(): void {
    root.setAttribute("aria-valuenow", String(currentValue));
  }

  function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  // --- Event Handlers ---

  function handleHover(index: number): void {
    if (opts.readonly || destroyed) return;
    hoverValue = index + 1;
    renderIcons();
    opts.onHover?.(hoverValue);
  }

  function handleLeave(): void {
    if (opts.readonly || destroyed) return;
    hoverValue = null;
    renderIcons();
    opts.onHover?.(currentValue);
  }

  function handleClick(e: MouseEvent, index: number): void {
    if (opts.readonly || destroyed) return;
    e.preventDefault();

    let newValue: number;

    if (opts.allowPrecise) {
      // Precise: use click position within the icon
      const el = iconEls[index]!;
      const rect = el.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      newValue = index + clamp(ratio, 0.05, 1);
    } else if (opts.allowHalf) {
      // Half: detect left/right half of icon
      const el = iconEls[index]!;
      const rect = el.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      newValue = isLeftHalf ? index + 0.5 : index + 1;
    } else {
      newValue = index + 1;
    }

    // Clicking same value again clears it (if > max/2)
    if (newValue === currentValue && currentValue > opts.max / 2) {
      newValue = 0;
    }

    setValue(newValue);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (opts.readonly || destroyed) return;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        setValue(clamp(currentValue + (opts.allowHalf ? 0.5 : 1), 0, opts.max));
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        setValue(clamp(currentValue - (opts.allowHalf ? 0.5 : 1), 0, opts.max));
        break;
      case "Home":
        e.preventDefault();
        setValue(opts.max);
        break;
      case "End":
        e.preventDefault();
        setValue(0);
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        setValue(0);
        break;
    }
  }

  // Bind keyboard
  root.addEventListener("keydown", handleKeyDown);

  // Initialize render
  renderIcons();

  // --- Public API ---

  function setValue(value: number): void {
    const step = opts.allowPrecise ? 0.1 : opts.allowHalf ? 0.5 : 1;
    currentValue = Math.round(clamp(value, 0, opts.max) / step) * step;
    hoverValue = null;
    renderIcons();
    updateLabel();
    updateClearVisibility();
    updateAria();
    opts.onChange?.(currentValue);
  }

  function reset(): void {
    setValue(0);
  }

  // Instance
  const instance: RatingInputInstance = {
    element: root,

    getValue() { return currentValue; },

    setValue,

    reset,

    getPercentage() { return (currentValue / opts.max) * 100; },

    destroy() {
      destroyed = true;
      root.removeEventListener("keydown", handleKeyDown);
      root.remove();
    },
  };

  return instance;
}
