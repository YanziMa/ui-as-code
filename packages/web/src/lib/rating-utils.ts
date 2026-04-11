/**
 * Rating Utilities: Star rating component with half-star support,
 * custom icons, keyboard navigation, read-only mode, and hover preview.
 */

// --- Types ---

export type RatingIconType = "star" | "heart" | "thumb" | "emoji" | "custom";

export interface RatingOptions {
  /** Max rating value (default 5) */
  max?: number;
  /** Initial value */
  value?: number;
  /** Allow half increments? */
  allowHalf?: boolean;
  /** Read-only mode (no interaction) */
  readOnly?: boolean;
  /** Icon type */
  iconType?: RatingIconType;
  /** Custom filled icon (HTML string) */
  filledIcon?: string;
  /** Custom empty icon (HTML string) */
  emptyIcon?: string;
  /** Custom half-filled icon (HTML string) */
  halfIcon?: string;
  /** Active color */
  activeColor?: string;
  /** Inactive color */
  inactiveColor?: string;
  /** Size ("sm", "md", "lg") */
  size?: "sm" | "md" | "lg";
  /** Show numeric value label */
  showValue?: boolean;
  /** Called when rating changes */
  onChange?: (value: number) => void;
  /** Custom class name */
  className?: string;
}

export interface RatingInstance {
  /** The root element */
  el: HTMLElement;
  /** Get current value */
  getValue: () => number;
  /** Set value programmatically */
  setValue: (value: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Icon Sets ---

const ICON_SETS: Record<RatingIconType, { filled: string; empty: string; half: string }> = {
  "star": {
    filled: "&#9733;",
    empty: "&#9734;",
    half: "&#9733;",
  },
  "heart": {
    filled: "&#10084;",
    empty: "&#9825;",
    half: "&#10084;",
  },
  "thumb": {
    filled: "&#128077;",
    empty: "&#128078;",
    half: "&#128077;",
  },
  "emoji": {
    filled: "&#128522;",
    empty: "&#128528;",
    half: "&#128523;",
  },
  "custom": {
    filled: "",
    empty: "",
    half: "",
  },
};

const SIZE_CONFIG: Record<string, { fontSize: string; gap: string }> = {
  "sm": { fontSize: "16px", gap: "2px" },
  "md": { fontSize: "22px", gap: "3px" },
  "lg": { fontSize: "30px", gap: "4px" },
};

// --- Core Factory ---

/**
 * Create a star/rating component.
 *
 * @example
 * ```ts
 * const rating = createRating({
 *   max: 5,
 *   value: 3.5,
 *   allowHalf: true,
 *   onChange: (v) => console.log("Rated:", v),
 * });
 * ```
 */
export function createRating(options: RatingOptions): RatingInstance {
  const {
    max = 5,
    value = 0,
    allowHalf = false,
    readOnly = false,
    iconType = "star",
    filledIcon,
    emptyIcon,
    halfIcon,
    activeColor = "#fbbf24",
    inactiveColor = "#d1d5db",
    size = "md",
    showValue = false,
    onChange,
    className,
  } = options;

  let _value = Math.max(0, Math.min(value, max));
  let _hoverValue: number | null = null;

  const icons = ICON_SETS[iconType];
  const sc = SIZE_CONFIG[size];

  // Root
  const root = document.createElement("div");
  root.className = `rating ${iconType} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;align-items:center;gap:" + sc.gap + ";" +
    (readOnly ? "" : "cursor:pointer;") +
    "user-select:none;";
  root.setAttribute("role", "slider");
  root.setAttribute("aria-valuemin", "0");
  root.setAttribute("aria-valuemax", String(max));
  root.setAttribute("aria-valuenow", String(_value));
  root.setAttribute("aria-label", "Rating");

  // Stars container
  const starsContainer = document.createElement("div");
  starsContainer.className = "rating-stars";
  starsContainer.style.cssText = "display:flex;align-items:center;gap:" + sc.gap + ";";

  // Render stars
  const starEls: HTMLElement[] = [];

  for (let i = 1; i <= max; i++) {
    const star = document.createElement("button");
    star.type = "button";
    star.className = "rating-star";
    star.dataset.value = String(i);
    star.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "background:none;border:none;padding:0;cursor:pointer;" +
      "color:" + inactiveColor + ";" +
      "font-size:" + sc.fontSize + ";" +
      "line-height:1;transition:color 0.12s transform 0.12s;" +
      "outline:none;";

    star.innerHTML = filledIcon || icons.filled || "&#9733;";
    starsContainer.appendChild(star);
    starEls.push(star);

    if (!readOnly) {
      star.addEventListener("click", () => {
        _setValue(i);
      });

      star.addEventListener("mouseenter", () => {
        _hoverValue = i;
        _updateVisuals();
      });

      star.addEventListener("mousemove", (e) => {
        if (!allowHalf) return;
        const rect = star.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        if (relX < rect.width / 2) {
          _hoverValue = i - 0.5;
          _updateVisuals();
        } else {
          _hoverValue = i;
          _updateVisuals();
        }
      });
    }
  }

  starsContainer.addEventListener("mouseleave", () => {
    _hoverValue = null;
    _updateVisuals();
  });

  root.appendChild(starsContainer);

  // Value label
  let valueLabel: HTMLElement | null = null;
  if (showValue) {
    valueLabel = document.createElement("span");
    valueLabel.className = "rating-value";
    valueLabel.style.cssText =
      "margin-left:8px;font-size:" + sc.fontSize + ";font-weight:600;color:#374151;min-width:24px;";
    valueLabel.textContent = _value.toFixed(allowHalf ? 1 : 0);
    root.appendChild(valueLabel);
  }

  // Initial render
  _updateVisuals();

  // --- Methods ---

  function getValue(): number { return _value; }

  function setValue(val: number): void {
    const newVal = Math.max(0, Math.min(val, allowHalf ? max - 0.5 : max));
    if (newVal === _value) return;
    _value = newVal;
    _updateVisuals();
    root.setAttribute("aria-valuenow", String(_value));
    if (valueLabel) valueLabel.textContent = _value.toFixed(allowHalf ? 1 : 0);
    onChange?.(_value);
  }

  function destroy(): void { root.remove(); }

  // --- Internal ---

  function _setValue(val: number): void {
    if (allowHalf) {
      // Determine exact position within star
      setValue(val);
    } else {
      setValue(val);
    }
  }

  function _updateVisuals(): void {
    const displayValue = _hoverValue ?? _value;

    starEls.forEach((star, idx) => {
      const i = idx + 1;
      const isFull = displayValue >= i;
      const isHalf = !isFull && displayValue >= i - 0.5 && displayValue < i;

      if (isFull) {
        star.style.color = activeColor;
        star.style.transform = "scale(1.1)";
        star.innerHTML = filledIcon || icons.filled || "&#9733;";
      } else if (isHalf && allowHalf) {
        star.style.color = activeColor;
        star.style.transform = "scale(1)";
        star.innerHTML = halfIcon || icons.half || "&#9733;";
        // For half star, use CSS gradient trick
        star.style.background = `linear-gradient(to right, ${activeColor} 50%, ${inactiveColor} 50%)`;
        star.style.webkitBackgroundClip = "text";
        star.style.webkitTextFillColor = "transparent";
        star.style.backgroundClip = "text";
      } else {
        star.style.color = inactiveColor;
        star.style.transform = "scale(1)";
        star.innerHTML = emptyIcon || icons.empty || "&#9734;";
        star.style.background = "";
        star.style.webkitBackgroundClip = "";
        star.style.webkitTextFillColor = "";
        star.style.backgroundClip = "";
      }
    });
  }

  return { el: root, getValue, setValue, destroy };
}
