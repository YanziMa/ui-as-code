/**
 * Rating Stars: Interactive star rating component with half-star support,
 * hover preview, custom icons, animation, labels, and read-only mode.
 */

// --- Types ---

export type StarIcon = "star" | "heart" | "thumb" | "fire" | "bolt" | "diamond";
export type RatingSize = "sm" | "md" | "lg";

export interface RatingStarsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial rating value (0 to max) */
  value?: number;
  /** Maximum rating (default: 5) */
  max?: number;
  /** Allow half-star ratings? */
  allowHalf?: boolean;
  /** Icon type */
  icon?: StarIcon;
  /** Size variant */
  size?: RatingSize;
  /** Active color */
  activeColor?: string;
  /** Inactive color */
  inactiveColor?: string;
  /** Hover color (defaults to activeColor) */
  hoverColor?: string;
  /** Show numeric value? */
  showValue?: boolean;
  /** Show label text? */
  showLabel?: boolean;
  /** Custom labels per value (1-indexed) */
  labels?: string[];
  /** Read-only mode (no interaction) */
  readOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Animated fill on change? */
  animated?: boolean;
  /** Clear on click active star? */
  clearable?: boolean;
  /** Callback on rating change */
  onChange?: (value: number) => void;
  /** Callback on hover */
  onHover?: (value: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RatingStarsInstance {
  element: HTMLElement;
  getValue: () => number;
  setValue: (value: number) => void;
  getMax: () => number;
  setMax: (max: number) => void;
  reset: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Icon SVG Paths ---

const ICON_PATHS: Record<StarIcon, { full: string; half: string; empty: string }> = {
  star: {
    full: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    half: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77V2z",
    empty: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  heart: {
    full: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    half: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67V21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    empty: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  },
  thumb: {
    full: "M14.406 16.654l1.879 6.177A2 2 0 0 0 18.202 24h3.596a2 2 0 0 0 1.917-2.169l-1.08-7.668A6 6 0 0 0 23 10V6a4 4 0 0 0-4-4h-2.5a2 2 0 0 0-1.97 1.638l-.737 4.41A2 2 0 0 1 11.82 10H8a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6h2.406z",
    half: "M14.406 16.654l1.879 6.177A2 2 0 0 0 18.202 24h3.596a2 2 0 0 0 1.917-2.169l-1.08-7.668A6 6 0 0 0 23 10V6a4 4 0 0 0-4-4h-2.5a2 2 0 0 0-1.97 1.638l-.737 4.41A2 2 0 0 1 11.82 10H8v8h2.406z",
    empty: "M14.406 16.654l1.879 6.177A2 2 0 0 0 18.202 24h3.596a2 2 0 0 0 1.917-2.169l-1.08-7.668A6 6 0 0 0 23 10V6a4 4 0 0 0-4-4h-2.5a2 2 0 0 0-1.97 1.638l-.737 4.41A2 2 0 0 1 11.82 10H8a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6h2.406z",
  },
  fire: {
    full: "M12 23c-4.97 0-9-3.582-9-8 0-3.212 2.165-5.95 5.124-7.28C8.048 9.08 8 10.03 8 11c0 2.208 1.792 4 4 4 .734 0 1.42-.198 2.01-.543C13.998 15.63 14 15.814 14 16c0 3.866-3.134 7-7 7zm5.82-11.68C19.64 12.36 21 14.52 21 17c0 3.314-2.686 6-6 6-.353 0-.698-.03-1.034-.088C16.056 21.62 17.5 19.48 17.5 17c0-1.186-.39-2.283-1.046-3.168L17.82 11.32z",
    half: "M12 23c-4.97 0-9-3.582-9-8 0-3.212 2.165-5.95 5.124-7.28C8.048 9.08 8 10.03 8 11c0 2.208 1.792 4 4 4 .734 0 1.42-.198 2.01-.543C13.998 15.63 14 15.814 14 16c0 3.866-3.134 7-7 7z",
    empty: "M12 23c-4.97 0-9-3.582-9-8 0-3.212 2.165-5.95 5.124-7.28C8.048 9.08 8 10.03 8 11c0 2.208 1.792 4 4 4 .734 0 1.42-.198 2.01-.543C13.998 15.63 14 15.814 14 16c0 3.866-3.134 7-7 7z",
  },
  bolt: {
    full: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    half: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    empty: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  diamond: {
    full: "M12 2L2 12l10 10 10-10L12 2z",
    half: "M12 2L2 12l10 10V2z",
    empty: "M12 2L2 12l10 10 10-10L12 2z",
  },
};

const SIZE_MAP: Record<RatingSize, { star: number; gap: number }> = {
  sm: { star: 18, gap: 2 },
  md: { star: 24, gap: 4 },
  lg: { star: 32, gap: 6 },
};

const DEFAULT_LABELS = ["Terrible", "Poor", "Average", "Good", "Excellent"];

// --- Main Factory ---

export function createRatingStars(options: RatingStarsOptions): RatingStarsInstance {
  const opts = {
    value: options.value ?? 0,
    max: options.max ?? 5,
    allowHalf: options.allowHalf ?? false,
    icon: options.icon ?? "star",
    size: options.size ?? "md",
    activeColor: options.activeColor ?? "#f59e0b",
    inactiveColor: options.inactiveColor ?? "#d1d5db",
    hoverColor: options.hoverColor ?? "",
    showValue: options.showValue ?? false,
    showLabel: options.showLabel ?? false,
    readOnly: options.readOnly ?? false,
    disabled: options.disabled ?? false,
    animated: options.animated ?? true,
    clearable: options.clearable ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RatingStars: container not found");

  let currentValue = Math.max(0, Math.min(opts.max, opts.value));
  let hoverValue = -1;
  let destroyed = false;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `rating-stars ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;flex-direction:column;align-items:center;gap:4px;
    font-family:-apple-system,sans-serif;${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  container.appendChild(wrapper);

  // Stars row
  const starsRow = document.createElement("div");
  starsRow.className = "rs-stars-row";
  starsRow.style.cssText = `
    display:inline-flex;align-items:center;gap:${SIZE_MAP[opts.size].gap}px;
    direction:ltr;
  `;
  wrapper.appendChild(starsRow);

  // Create star elements
  const starEls: HTMLElement[] = [];
  for (let i = 0; i < opts.max; i++) {
    const starEl = createStarElement(i);
    starEls.push(starEl);
    starsRow.appendChild(starEl);
  }

  // Value display
  let valueDisplay: HTMLSpanElement | null = null;
  if (opts.showValue) {
    valueDisplay = document.createElement("span");
    valueDisplay.className = "rs-value";
    valueDisplay.style.cssText = "font-size:14px;font-weight:600;color:#374151;";
    updateValueDisplay();
    wrapper.appendChild(valueDisplay);
  }

  // Label display
  let labelDisplay: HTMLSpanElement | null = null;
  if (opts.showLabel) {
    labelDisplay = document.createElement("span");
    labelDisplay.className = "rs-label";
    labelDisplay.style.cssText = "font-size:12px;color:#6b7280;";
    updateLabelDisplay();
    wrapper.appendChild(labelDisplay);
  }

  function createStarElement(index: number): HTMLElement {
    const size = SIZE_MAP[opts.size].star;
    const el = document.createElement("div");
    el.className = "rs-star";
    el.dataset.index = String(index);
    el.style.cssText = `
      position:relative;width:${size}px;height:${size}px;cursor:${opts.readOnly || opts.disabled ? "default" : "pointer"};
      transition:transform ${opts.animated ? "0.15s ease" : "none"};
      user-select:none;-webkit-user-select:none;
    `;
    el.setAttribute("role", "radio");
    el.setAttribute("aria-label", `${index + 1} star${index === 0 ? "" : "s"}`);
    el.setAttribute("tabindex", opts.readOnly || opts.disabled ? "-1" : "0");

    // Create SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.style.cssText = "display:block;overflow:visible;";

    // Background (empty) star
    const bgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bgPath.setAttribute("d", ICON_PATHS[opts.icon].empty);
    bgPath.setAttribute("fill", opts.inactiveColor);
    bgPath.setAttribute("stroke", "none");

    // Foreground (filled) clip
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const clipId = `rs-clip-${Date.now()}-${index}`;
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipId);
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", "0");
    clipRect.setAttribute("y", "0");
    clipRect.setAttribute("width", "0");
    clipRect.setAttribute("height", "24");
    clipRect.dataset.fillWidth = "";
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);

    const fgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    fgPath.setAttribute("d", ICON_PATHS[opts.icon].full);
    fgPath.setAttribute("fill", opts.activeColor);
    fgPath.setAttribute("clip-path", `url(#${clipId})`);

    svg.append(defs, bgPath, fgPath);
    el.appendChild(svg);

    // Store references
    (el as any)._clipRect = clipRect;
    (el as any)_fgPath = fgPath;

    // Events
    if (!opts.readOnly && !opts.disabled) {
      el.addEventListener("mouseenter", () => handleHover(index));
      el.addEventListener("mouseleave", handleLeave);
      el.addEventListener("mousemove", (e) => handleMouseMove(e, index));
      el.addEventListener("click", () => handleClick(index));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(index);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const next = Math.min(opts.max, currentValue + (opts.allowHalf ? 0.5 : 1));
          setValue(next);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = Math.max(0, currentValue - (opts.allowHalf ? 0.5 : 1));
          setValue(prev);
        }
      });
    }

    return el;
  }

  function handleHover(index: number): void {
    if (opts.readOnly || opts.disabled) return;
    hoverValue = index + 1;
    renderStars(hoverValue);
    opts.onHover?.(hoverValue);
  }

  function handleLeave(): void {
    hoverValue = -1;
    renderStars(currentValue);
  }

  function handleMouseMove(e: MouseEvent, index: number): void {
    if (!opts.allowHalf || opts.readOnly || opts.disabled) return;
    const el = starEls[index]!;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    hoverValue = isLeftHalf ? index + 0.5 : index + 1;
    renderStars(hoverValue);
    opts.onHover?.(hoverValue);
  }

  function handleClick(index: number): void {
    if (opts.readOnly || opts.disabled) return;

    let newValue: number;
    if (opts.allowHalf) {
      const el = starEls[index]!;
      // Use last known hover position for half-star detection
      newValue = hoverValue >= 0 ? hoverValue : index + 1;
    } else {
      newValue = index + 1;
    }

    // Clearable: clicking same value resets
    if (opts.clearable && newValue === currentValue) {
      newValue = 0;
    }

    setValue(newValue);
  }

  function setValue(val: number): void {
    currentValue = Math.max(0, Math.min(opts.max, val));
    hoverValue = -1;
    renderStars(currentValue);
    updateValueDisplay();
    updateLabelDisplay();
    opts.onChange?.(currentValue);
  }

  function renderStars(value: number): void {
    for (let i = 0; i < opts.max; i++) {
      const el = starEls[i]!;
      const clipRect = (el as any)._clipRect as SVGRectElement;
      const fgPath = (el as any)._fgPath as SVGPathElement;

      if (!clipRect || !fgPath) continue;

      const starValue = i + 1;
      const fillPercent = Math.max(0, Math.min(1, value - i));

      if (fillPercent <= 0) {
        clipRect.setAttribute("width", "0");
        fgPath.setAttribute("fill", opts.activeColor);
      } else if (fillPercent >= 1) {
        clipRect.setAttribute("width", "24");
        fgPath.setAttribute("fill", opts.hoverValue >= 0 && opts.hoverColor ? opts.hoverColor : opts.activeColor);
      } else {
        clipRect.setAttribute("width", String(fillPercent * 24));
        fgPath.setAttribute("fill", opts.hoverValue >= 0 && opts.hoverColor ? opts.hoverColor : opts.activeColor);
      }

      // Scale animation
      if (opts.animated && value > 0 && fillPercent > 0 && fillPercent < 1) {
        el.style.transform = "scale(1.15)";
        setTimeout(() => { el.style.transform = ""; }, 150);
      }
    }
  }

  function updateValueDisplay(): void {
    if (valueDisplay) {
      valueDisplay.textContent = opts.allowHalf ? currentValue.toFixed(1) : String(currentValue);
    }
  }

  function updateLabelDisplay(): void {
    if (labelDisplay && opts.labels) {
      const idx = Math.ceil(currentValue) - 1;
      labelDisplay.textContent = opts.labels[idx] ?? "";
    } else if (labelDisplay) {
      const idx = Math.ceil(currentValue) - 1;
      labelDisplay.textContent = DEFAULT_LABELS[idx] ?? "";
    }
  }

  // Initial render
  renderStars(currentValue);

  const instance: RatingStarsInstance = {
    element: wrapper,

    getValue() { return currentValue; },

    setValue(val: number) { setValue(val); },

    getMax() { return opts.max; },

    setMax(max: number) {
      opts.max = max;
      // Rebuild stars
      starsRow.innerHTML = "";
      starEls.length = 0;
      for (let i = 0; i < max; i++) {
        const el = createStarElement(i);
        starEls.push(el);
        starsRow.appendChild(el);
      }
      currentValue = Math.min(currentValue, max);
      renderStars(currentValue);
    },

    reset() {
      setValue(0);
    },

    disable() {
      opts.disabled = true;
      wrapper.style.opacity = "0.5";
      wrapper.style.pointerEvents = "none";
    },

    enable() {
      opts.disabled = false;
      wrapper.style.opacity = "";
      wrapper.style.pointerEvents = "";
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
    },
  };

  return instance;
}
