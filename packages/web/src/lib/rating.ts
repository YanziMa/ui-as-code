/**
 * Star Rating Component: Interactive star rating with half-star support, hover preview,
 * custom icons/sizes/colors, keyboard navigation, read-only mode, ARIA accessibility,
 * animated transitions, and value labels.
 */

// --- Types ---

export type StarIconType = "star" | "heart" | "thumb" | "fire" | "bolt" | "custom";

export interface RatingOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Maximum rating value (default: 5) */
  maxStars?: number;
  /** Initial rating value */
  value?: number;
  /** Allow half-star ratings (default: false) */
  allowHalf?: boolean;
  /** Icon type */
  icon?: StarIconType;
  /** Custom SVG path for filled state (when icon="custom") */
  customIconPath?: string;
  /** Size in px (default: 24) */
  size?: number;
  /** Color for active stars (CSS value) */
  activeColor?: string;
  /** Color for inactive stars */
  inactiveColor?: string;
  /** Color on hover */
  hoverColor?: string;
  /** Gap between stars (px) */
  gap?: number;
  /** Show numeric value label */
  showValue?: boolean;
  /** Custom labels per value (e.g., {1:"Poor", 3:"Good", 5:"Excellent"}) */
  valueLabels?: Record<number, string>;
  /** Read-only mode (no interaction) */
  readOnly?: boolean;
  /** Callback on rating change */
  onChange?: (value: number) => void;
  /** Callback on hover (preview value) */
  onHover?: (value: number) => void;
  /** Clear button visible on hover? */
  clearable?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface RatingInstance {
  element: HTMLElement;
  getValue: () => number;
  setValue: (value: number) => void;
  reset: () => void;
  destroy: () => void;
}

// --- SVG Icons ---

const ICON_PATHS: Record<string, { filled: string; outline: string }> = {
  star: {
    filled: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    outline: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  heart: {
    filled: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
    outline: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  },
  thumb: {
    filled: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3",
    outline: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3",
  },
  fire: {
    filled: "M12 23c-3.866 0-7-3.134-7-7 0-2.577 1.17-4.86 3-6.374V7a5 5 0 0110 0v2.626c1.83 1.514 3 3.797 3 6.374 0 3.866-3.134 7-7 7z",
    outline: "M12 23c-3.866 0-7-3.134-7-7 0-2.577 1.17-4.86 3-6.374V7a5 5 0 0110 0v2.626c1.83 1.514 3 3.797 3 6.374 0 3.866-3.134 7-7 7z",
  },
  bolt: {
    filled: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    outline: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
};

function createStarSVG(
  iconType: StarIconType,
  customPath: string | undefined,
  size: number,
  filled: boolean,
  color: string,
): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.display = "block";
  svg.style.transition = `transform ${150}ms ease, color 0.15s ease`;

  const paths = iconType === "custom" && customPath
    ? { filled: customPath, outline: customPath }
    : ICON_PATHS[iconType] ?? ICON_PATHS.star;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", paths.filled);
  path.setAttribute("fill", filled ? color : "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", filled ? "0" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");

  svg.appendChild(path);
  return svg;
}

// --- Main Class ---

export class RatingManager {
  create(options: RatingOptions): RatingInstance {
    const opts = {
      maxStars: options.maxStars ?? 5,
      value: options.value ?? 0,
      allowHalf: options.allowHalf ?? false,
      icon: options.icon ?? "star",
      size: options.size ?? 24,
      activeColor: options.activeColor ?? "#f59e0b",
      inactiveColor: options.inactiveColor ?? "#d1d5db",
      hoverColor: options.hoverColor ?? "#fbbf24",
      gap: options.gap ?? 4,
      showValue: options.showValue ?? false,
      readOnly: options.readOnly ?? false,
      clearable: options.clearable ?? false,
      animationDuration: options.animationDuration ?? 200,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Rating: container element not found");

    container.className = `rating ${opts.className ?? ""}`;
    container.style.cssText = `
      display:inline-flex;align-items:center;gap:${opts.gap}px;
      ${opts.readOnly ? "cursor:default;" : "cursor:pointer;"}
    `;

    // Stars container
    const starsContainer = document.createElement("div");
    starsContainer.className = "rating-stars";
    starsContainer.style.cssText = "display:flex;align-items:center;gap:" + opts.gap + "px;";
    container.appendChild(starsContainer);

    // Value label
    let valueLabel: HTMLSpanElement | null = null;
    if (opts.showValue) {
      valueLabel = document.createElement("span");
      valueLabel.className = "rating-value-label";
      valueLabel.style.cssText = "margin-left:8px;font-size:14px;font-weight:500;color:#374151;";
      container.appendChild(valueLabel);
    }

    // Clear button
    let clearBtn: HTMLButtonElement | null = null;
    if (opts.clearable && !opts.readOnly) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.innerHTML = "&times;";
      clearBtn.title = "Clear rating";
      clearBtn.style.cssText = `
        margin-left:4px;background:none;border:none;font-size:16px;
        color:#9ca3af;cursor:pointer;padding:2px;line-height:1;opacity:0;
        transition:opacity 0.15s;
      `;
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.reset();
      });
      container.appendChild(clearBtn);

      container.addEventListener("mouseenter", () => {
        if (clearBtn && opts.value > 0) clearBtn.style.opacity = "1";
      });
      container.addEventListener("mouseleave", () => {
        if (clearBtn) clearBtn.style.opacity = "0";
      });
    }

    // State
    let currentValue = opts.value;
    let hoverValue = -1;
    let destroyed = false;
    const stars: HTMLDivElement[] = [];

    function renderStars(previewValue: number = -1): void {
      starsContainer.innerHTML = "";
      stars.length = 0;

      const displayValue = previewValue >= 0 ? previewValue : currentValue;

      for (let i = 1; i <= opts.maxStars; i++) {
        const starWrapper = document.createElement("div");
        starWrapper.className = "rating-star";
        starWrapper.dataset.value = String(i);
        starWrapper.style.cssText = `
          position:relative;display:inline-block;width:${opts.size}px;height:${opts.size}px;
        `;

        const fullValue = displayValue;
        const isFull = fullValue >= i;
        const isHalf = opts.allowHalf && fullValue >= i - 0.5 && fullValue < i;

        // Full star (background)
        const fullSvg = createStarSVG(
          opts.icon, opts.customIconPath, opts.size,
          true, isFull ? (previewValue >= 0 ? opts.hoverColor : opts.activeColor) : "transparent",
        );
        fullSvg.style.position = "absolute";
        fullSvg.style.top = "0";
        fullSvg.style.left = "0";
        starWrapper.appendChild(fullSvg);

        // Half star overlay (if needed)
        if (isHalf) {
          const halfSvg = createStarSVG(
            opts.icon, opts.customIconPath, opts.size,
            true, previewValue >= 0 ? opts.hoverColor : opts.activeColor,
          );
          halfSvg.style.position = "absolute";
          halfSvg.style.top = "0";
          halfSvg.style.left = "0";
          halfSvg.style.clipPath = "inset(0 50% 0 0)";
          starWrapper.appendChild(halfSvg);
        }

        // Outline star (always shown behind)
        const outlineSvg = createStarSVG(
          opts.icon, opts.customIconPath, opts.size,
          false, opts.inactiveColor,
        );
        outlineSvg.style.position = "absolute";
        outlineSvg.style.top = "0";
        outlineSvg.style.left = "0";
        // Insert outline first so it's behind
        starWrapper.insertBefore(outlineSvg, starWrapper.firstChild);

        if (!opts.readOnly) {
          starWrapper.addEventListener("mouseenter", () => {
            hoverValue = i;
            renderStars(hoverValue);
            opts.onHover?.(i);
          });

          starWrapper.addEventListener("mousemove", (e) => {
            if (!opts.allowHalf) return;
            const rect = starWrapper.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            if (relX < opts.size / 2) {
              hoverValue = i - 0.5;
            } else {
              hoverValue = i;
            }
            renderStars(hoverValue);
            opts.onHover?.(hoverValue);
          });

          starWrapper.addEventListener("mouseleave", () => {
            hoverValue = -1;
            renderStars(-1);
          });

          starWrapper.addEventListener("click", (e) => {
            let newVal: number;
            if (opts.allowHalf) {
              const rect = starWrapper.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              newVal = relX < opts.size / 2 ? i - 0.5 : i;
            } else {
              newVal = i;
            }
            setValue(newVal);
          });
        }

        starsContainer.appendChild(starWrapper);
        stars.push(starWrapper);
      }

      updateValueLabel(displayValue);
    }

    function setValue(val: number): void {
      currentValue = Math.max(0, Math.min(opts.maxStars, val));
      renderStars(-1);
      opts.onChange?.(currentValue);
    }

    function updateValueLabel(val: number): void {
      if (!valueLabel) return;
      if (opts.valueLabels && opts.valueLabels[Math.round(val)]) {
        valueLabel.textContent = opts.valueLabels[Math.round(val)];
      } else {
        valueLabel.textContent = `${val.toFixed(opts.allowHalf ? 1 : 0)} / ${opts.maxStars}`;
      }
    }

    // Keyboard support
    if (!opts.readOnly) {
      container.tabIndex = 0;
      container.setAttribute("role", "slider");
      container.setAttribute("aria-valuemin", "0");
      container.setAttribute("aria-valuemax", String(opts.maxStars));
      container.setAttribute("aria-valuenow", String(currentValue));

      container.addEventListener("keydown", (e: KeyboardEvent) => {
        const step = opts.allowHalf ? 0.5 : 1;
        switch (e.key) {
          case "ArrowRight":
          case "ArrowUp":
            e.preventDefault();
            setValue(Math.min(opts.maxStars, currentValue + step));
            break;
          case "ArrowLeft":
          case "ArrowDown":
            e.preventDefault();
            setValue(Math.max(0, currentValue - step));
            break;
          case "Home":
            e.preventDefault();
            setValue(0);
            break;
          case "End":
            e.preventDefault();
            setValue(opts.maxStars);
            break;
          case "Delete":
          case "Backspace":
            if (opts.clearable) {
              e.preventDefault();
              instance.reset();
            }
            break;
        }
      });
    }

    // Initial render
    renderStars(-1);

    const instance: RatingInstance = {
      element: container,

      getValue() { return currentValue; },

      setValue(val: number) { setValue(val); },

      reset() {
        currentValue = 0;
        renderStars(-1);
        opts.onChange?.(0);
      },

      destroy() {
        destroyed = true;
        starsContainer.innerHTML = "";
        if (valueLabel) valueLabel.remove();
        if (clearBtn) clearBtn.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a rating component */
export function createRating(options: RatingOptions): RatingInstance {
  return new RatingManager().create(options);
}
