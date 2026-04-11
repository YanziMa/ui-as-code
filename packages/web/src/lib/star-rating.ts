/**
 * Star Rating Utilities: Interactive star rating component with half-star
 * support, custom icons/sizes/colors, ARIA accessibility, hover preview,
 * read-only mode, and animated transitions.
 */

// --- Types ---

export type StarRatingSize = "xs" | "sm" | "md" | "lg" | "xl";
export type StarIcon = "star" | "heart" | "thumb" | "flame" | "bolt" | "diamond";

export interface StarRatingOptions {
  /** Container element */
  container?: HTMLElement;
  /** Initial value (0 to max) */
  value?: number;
  /** Maximum number of stars */
  max?: number;
  /** Allow half-star increments */
  allowHalf?: boolean;
  /** Icon shape */
  icon?: StarIcon;
  /** Size variant */
  size?: StarRatingSize;
  /** Color for filled stars */
  activeColor?: string;
  /** Color for empty stars */
  inactiveColor?: string;
  /** Color on hover */
  hoverColor?: string;
  /** Read-only (no interaction) */
  readOnly?: boolean;
  /** Show value label */
  showValue?: boolean;
  /** Custom label formatter */
  labelFormatter?: (value: number) => string;
  /** Called when value changes */
  onChange?: (value: number) => void;
  /** Called on hover */
  onHover?: (value: number) => void;
  /** Custom class name */
  className?: string;
}

export interface StarRatingInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current value */
  getValue: () => number;
  /** Set value programmatically */
  setValue: (value: number) => void;
  /** Reset to initial/zero */
  reset: () => void;
  /** Enable interaction */
  enable: () => void;
  /** Disable interaction */
  disable: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const SIZE_MAP: Record<StarRatingSize, { fontSize: string; gap: string }> = {
  xs: { fontSize: "12px", gap: "2px" },
  sm: { fontSize: "16px", gap: "3px" },
  md: { fontSize: "20px", gap: "4px" },
  lg: { fontSize: "28px", gap: "5px" },
  xl: { fontSize: "36px", gap: "6px" },
};

const ICON_CHARS: Record<StarIcon, { full: string; empty: string; half: string }> = {
  star:   { full: "\u2605", empty: "\u2606", half: "\uBD" },
  heart:  { full: "\u2665", empty: "\u2661", half: "\uBD" },
  thumb:  { full: "\u{1F44D}", empty: "\u{1F44E}", half: "\uBD" },
  flame:  { full: "\u{1F525}", empty: "\u{1F525}", half: "\uBD" },
  bolt:   { full: "\u26A1", empty: "\u26A1", half: "\uBD" },
  diamond: { full: "\u{1F48E}", empty: "\u{1F48E}", half: "\uBD" },
};

const DEFAULT_ACTIVE_COLOR = "#f59e0b";
const DEFAULT_INACTIVE_COLOR = "#d1d5db";
const DEFAULT_HOVER_COLOR = "#fbbf24";

// --- Core Factory ---

/**
 * Create an interactive star rating component.
 *
 * @example
 * ```ts
 * const rating = createStarRating({
 *   value: 3.5,
 *   max: 5,
 *   allowHalf: true,
 *   onChange: (v) => console.log("Rated:", v),
 * });
 * ```
 */
export function createStarRating(options: StarRatingOptions): StarRatingInstance {
  const {
    container,
    value = 0,
    max = 5,
    allowHalf = false,
    icon = "star",
    size = "md",
    activeColor = DEFAULT_ACTIVE_COLOR,
    inactiveColor = DEFAULT_INACTIVE_COLOR,
    hoverColor = DEFAULT_HOVER_COLOR,
    readOnly = false,
    showValue = false,
    labelFormatter,
    onChange,
    onHover,
    className,
  } = options;

  let _value = Math.max(0, Math.min(value, max));
  let _hoverValue: number | null = null;
  let _disabled = readOnly;
  const _initialValue = _value;

  const ss = SIZE_MAP[size];
  const ic = ICON_CHARS[icon];

  // Root
  const root = document.createElement("div");
  root.className = `star-rating ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:inline-flex;align-items:center;gap:${ss.gap};` +
    (_disabled ? "pointer-events:none;opacity:0.7;" : "cursor:pointer;") +
    "user-select:none;";

  // Stars container
  const starsContainer = document.createElement("div");
  starsContainer.className = "star-rating-stars";
  starsContainer.style.cssText =
    `display:inline-flex;align-items:center;gap:${ss.gap};`;

  const starEls: HTMLElement[] = [];

  for (let i = 0; i < max; i++) {
    const starEl = document.createElement("span");
    starEl.className = "star-rating-star";
    starEl.dataset.index = String(i);
    starEl.setAttribute("role", "radio");
    starEl.setAttribute("aria-checked", String(i < Math.ceil(_value)));
    starEl.setAttribute("aria-label", `${i + 1} star${i === 0 ? "" : "s"}`);
    starEl.tabIndex = _disabled ? -1 : 0;
    starEl.style.cssText =
      `font-size:${ss.fontSize};line-height:1;color:${inactiveColor};` +
      "transition:color 0.15s ease,transform 0.15s ease;display:inline-flex;" +
      "align-items:center;justify-content:center;";

    // Use layered approach for half-stars
    if (allowHalf) {
      starEl.innerHTML = `<span class="star-empty">${ic.empty}</span><span class="star-full" style="position:absolute;overflow:hidden;width:0%;color:${activeColor};transition:width 0.15s ease;">${ic.full}</span>`;
      starEl.style.position = "relative";
    } else {
      starEl.textContent = ic.full;
    }

    starEls.push(starEl);
    starsContainer.appendChild(starEl);
  }

  root.appendChild(starsContainer);

  // Value label
  let labelEl: HTMLElement | null = null;
  if (showValue) {
    labelEl = document.createElement("span");
    labelEl.className = "star-rating-label";
    labelEl.style.cssText =
      `margin-left:8px;font-size:${ss.fontSize};color:#6b7280;font-variant-numeric:tabular-nums;`;
    labelEl.textContent = labelFormatter ? labelFormatter(_value) : `${_value.toFixed(allowHalf ? 1 : 0)}`;
    root.appendChild(labelEl);
  }

  (container ?? document.body).appendChild(root);

  // --- Render ---

  function _render(): void {
    const displayValue = _hoverValue ?? _value;

    starEls.forEach((el, i) => {
      const starVal = i + 1;
      const isFull = displayValue >= starVal;
      const isHalf = allowHalf && displayValue >= i + 0.5 && displayValue < starVal;
      const isEmpty = !isFull && !isHalf;

      el.setAttribute("aria-checked", String(isFull || isHalf));

      if (allowHalf) {
        const fullPart = el.querySelector(".star-full") as HTMLElement;
        const emptyPart = el.querySelector(".star-empty") as HTMLElement;
        if (!fullPart || !emptyPart) return;

        if (isFull) {
          fullPart.style.width = "100%";
          fullPart.style.color = _hoverValue !== null ? hoverColor : activeColor;
          emptyPart.style.color = "";
        } else if (isHalf) {
          fullPart.style.width = "50%";
          fullPart.style.color = _hoverValue !== null ? hoverColor : activeColor;
          emptyPart.style.color = inactiveColor;
        } else {
          fullPart.style.width = "0%";
          emptyPart.style.color = inactiveColor;
        }
      } else {
        if (_hoverValue !== null) {
          el.style.color = displayValue > i ? hoverColor : inactiveColor;
        } else {
          el.style.color = displayValue > i ? activeColor : inactiveColor;
        }
        el.textContent = isFull ? ic.full : ic.empty;
      }

      // Hover scale effect
      if (_hoverValue !== null && displayValue > i && displayValue <= i + 1) {
        el.style.transform = "scale(1.15)";
      } else {
        el.style.transform = "";
      }
    });

    if (labelEl) {
      labelEl.textContent = labelFormatter
        ? labelFormatter(displayValue)
        : `${displayValue.toFixed(allowHalf ? 1 : 0)}`;
    }
  }

  // --- Events ---

  function _getValueFromEvent(e: MouseEvent | TouchEvent, target: HTMLElement): number {
    const rect = target.getBoundingClientRect();

    if (e instanceof MouseEvent) {
      if (allowHalf) {
        const x = e.clientX - rect.left;
        return (x / rect.width <= 0.5) ? target.dataset.index! + ".5" : String(parseInt(target.dataset.index!) + 1);
      }
      return String(parseInt(target.dataset.index!) + 1);
    }

    // Touch event
    const touch = (e as TouchEvent).changedTouches[0];
    if (!touch) return _value;
    const x = touch.clientX - rect.left;
    if (allowHalf) {
      return (x / rect.width <= 0.5) ? target.dataset.index! + ".5" : String(parseInt(target.dataset.index!) + 1);
    }
    return String(parseInt(target.dataset.index!) + 1);
  }

  if (!_disabled) {
    starsContainer.addEventListener("mousemove", (e) => {
      const target = e.target as HTMLElement;
      const star = target.closest(".star-rating-star") as HTMLElement | null;
      if (!star) return;
      _hoverValue = parseFloat(_getValueFromEvent(e, star));
      _render();
      onHover?.(_hoverValue);
    });

    starsContainer.addEventListener("mouseleave", () => {
      _hoverValue = null;
      _render();
    });

    starsContainer.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const star = target.closest(".star-rating-star") as HTMLElement | null;
      if (!star) return;
      const newValue = parseFloat(_getValueFromEvent(e, star));
      setValue(newValue);
    });

    // Keyboard navigation
    root.addEventListener("keydown", (e) => {
      const focused = document.activeElement;
      if (!focused?.classList.contains("star-rating-star")) return;

      const idx = parseInt(focused.dataset.index ?? "0");

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp": {
          e.preventDefault();
          const next = Math.min(idx + 1, max - 1);
          starEls[next]?.focus();
          break;
        }
        case "ArrowLeft":
        case "ArrowDown": {
          e.preventDefault();
          const prev = Math.max(idx - 1, 0);
          starEls[prev]?.focus();
          break;
        }
        case "Home":
          e.preventDefault();
          starEls[0]?.focus();
          setValue(0);
          break;
        case "End":
          e.preventDefault();
          starEls[max - 1]?.focus();
          setValue(max);
          break;
        case " ": {
          e.preventDefault();
          const val = idx + 1;
          if (_value === val) {
            setValue(0); // Toggle off
          } else {
            setValue(val);
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          setValue(idx + 1);
          break;
        }
      }
    });
  }

  // --- Methods ---

  function getValue(): number { return _value; }

  function setValue(newValue: number): void {
    const clamped = Math.max(0, Math.min(newValue, max));
    const rounded = allowHalf ? Math.round(clamped * 2) / 2 : Math.round(clamped);
    if (rounded === _value) return;
    _value = rounded;
    _render();
    onChange?.(_value);
  }

  function reset(): void {
    _value = _initialValue;
    _render();
  }

  function enable(): void {
    _disabled = false;
    root.style.cursor = "pointer";
    root.style.pointerEvents = "";
    root.style.opacity = "";
    starEls.forEach((el) => { el.tabIndex = 0; });
  }

  function disable(): void {
    _disabled = true;
    root.style.cursor = "";
    root.style.pointerEvents = "none";
    root.style.opacity = "0.7";
    starEls.forEach((el) => { el.tabIndex = -1; });
  }

  function destroy(): void { root.remove(); }

  _render();

  return { el: root, getValue, setValue, reset, enable, disable, destroy };
}
