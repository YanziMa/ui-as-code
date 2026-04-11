/**
 * Slider Utilities: Range slider with single/dual handles, step snapping,
 * tick marks, value labels, color gradient track, keyboard navigation,
 * and ARIA slider/splitter roles.
 */

// --- Types ---

export type SliderSize = "sm" | "md" | "lg";
export type SliderVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface SliderOptions {
  /** Name attribute */
  name?: string;
  /** Label text */
  label?: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment (0 = continuous) */
  step?: number;
  /** Initial value(s) — number for single, [number, number] for range */
  value?: number | [number, number];
  /** Range mode? (dual handles) */
  range?: boolean;
  /** Size variant */
  size?: SliderSize;
  /** Color variant */
  variant?: SliderVariant;
  /** Disabled? */
  disabled?: boolean;
  /** Show tick marks? */
  showTicks?: boolean;
  /** Number of tick marks to show */
  tickCount?: number;
  /** Show value label bubble? */
  showValueLabel?: boolean;
  /** Custom value formatter */
  formatValue?: (value: number) => string;
  /** Show min/max labels at ends? */
  showMinMaxLabels?: boolean;
  /** On change callback (fires continuously during drag) */
  onChange?: (value: number | [number, number]) => void;
  /** On change end callback (fires on mouseup/keyup) */
  onChangeEnd?: (value: number | [number, number]) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface SliderInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get current value(s) */
  getValue(): number | [number, number];
  /** Set value programmatically */
  setValue(value: number | [number, number]): void;
  /** Get the minimum value */
  getMin(): number;
  /** Set the minimum value */
  setMin(min: number): void;
  /** Get the maximum value */
  getMax(): number;
  /** Set the maximum value */
  setMax(max: number): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Focus the slider */
  focus(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const SLIDER_SIZES: Record<SliderSize, { height: string; thumbSize: string; fontSize: string }> = {
  "sm": { height: "4px", thumbSize: "14px", fontSize: "11px" },
  "md": { height: "6px", thumbSize: "18px", fontSize: "12px" },
  "lg": { height: "8px", thumbSize: "22px", fontSize: "13px" },
};

// --- Variant Colors ---

const SLIDER_VARIANTS: Record<SliderVariant, { active: string; bg: string }> = {
  "default": { active: "#374151", bg: "#e5e7eb" },
  "primary": { active: "#3b82f6", bg: "#dbeafe" },
  "success": { active: "#22c55e", bg: "#bbf7d0" },
  "warning": { active: "#f59e0b", bg: "#fef3c7" },
  "danger": { active: "#ef4444", bg: "#fecaca" },
};

// --- Core Factory ---

/**
 * Create a range slider component.
 *
 * @example
 * ```ts
 * // Single handle
 * const slider = createSlider({
 *   min: 0,
 *   max: 100,
 *   value: 50,
 *   onChange: (v) => console.log(v),
 * });
 *
 * // Range mode
 * const range = createSlider({
 *   min: 0,
 *   max: 100,
 *   range: true,
 *   value: [20, 80],
 * });
 * ```
 */
export function createSlider(options: SliderOptions): SliderInstance {
  const {
    name,
    label,
    min,
    max,
    step = 1,
    value: initialValue,
    range = false,
    size = "md",
    variant = "default",
    disabled = false,
    showTicks = false,
    tickCount,
    showValueLabel = false,
    formatValue,
    showMinMaxLabels = false,
    onChange,
    onChangeEnd,
    className,
    container,
  } = options;

  let _values: [number, number] = range
    ? (Array.isArray(initialValue) ? initialValue : [min, max])
    : [(typeof initialValue === "number" ? initialValue : min), (typeof initialValue === "number" ? initialValue : min)];

  if (!range && !Array.isArray(initialValue)) {
    _values = [initialValue ?? min, initialValue ?? min];
  }

  let _dragging: "lower" | "upper" | null = null;

  const sc = SLIDER_SIZES[size];
  const vc = SLIDER_VARIANTS[variant];

  // Root
  const root = document.createElement("div");
  root.className = `slider-wrapper ${size} ${variant} ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "6px";
  root.style.width = "100%";

  // Header row (label + value display)
  if (label || showValueLabel) {
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";

    if (label) {
      const labelEl = document.createElement("label");
      labelEl.className = "slider-label";
      labelEl.textContent = label;
      labelEl.style.cssText =
        `font-size:${sc.fontSize};font-weight:500;color:#374151;`;
      headerRow.appendChild(labelEl);
    }

    if (showValueLabel) {
      const valueDisplay = document.createElement("span");
      valueDisplay.className = "slider-value-display";
      valueDisplay.style.cssText =
        `font-size:${sc.fontSize};font-weight:600;color:${vc.active};`;
      updateValueDisplay(valueDisplay);
      // Store ref for updates
      (root as unknown as { _valueDisplay: HTMLElement })._valueDisplay = valueDisplay;
      headerRow.appendChild(valueDisplay);
    }

    root.appendChild(headerRow);
  }

  // Min/max labels row
  if (showMinMaxLabels) {
    const mmRow = document.createElement("div");
    mmRow.style.display = "flex";
    mmRow.style.justifyContent = "space-between";

    const minLabel = document.createElement("span");
    minLabel.textContent = formatValue ? formatValue(min) : String(min);
    minLabel.style.cssText = `font-size:11px;color:#9ca3af;`;

    const maxLabel = document.createElement("span");
    maxLabel.textContent = formatValue ? formatValue(max) : String(max);
    maxLabel.style.cssText = `font-size:11px;color:#9ca3af;`;

    mmRow.appendChild(minLabel);
    mmRow.appendChild(maxLabel);
    root.appendChild(mmRow);
  }

  // Track container
  const trackContainer = document.createElement("div");
  trackContainer.className = "slider-track-container";
  trackContainer.style.cssText =
    "position:relative;width:100%;height:" + (parseInt(sc.thumbSize) + 8) + "px;" +
    "display:flex;align-items:center;";

  // Track background
  const trackBg = document.createElement("div");
  trackBg.className = "slider-track-bg";
  trackBg.style.cssText =
    `width:100%;height:${sc.height};border-radius:${sc.height};` +
    `background:${vc.bg};position:relative;`;

  // Active fill
  const fill = document.createElement("div");
  fill.className = "slider-fill";
  fill.style.cssText =
    `height:100%;border-radius:${sc.height};background:${vc.active};` +
    "position:absolute;left:0;transition:left 0.05s,width 0.05s;";
  trackBg.appendChild(fill);

  // Tick marks
  if (showTicks) {
    const ticks = tickCount || Math.min(10, max - min + 1);
    for (let i = 0; i <= ticks; i++) {
      const tick = document.createElement("div");
      tick.className = "slider-tick";
      const pct = (i / ticks) * 100;
      tick.style.cssText =
        "position:absolute;top:-2px;transform:translateX(-50%);" +
        `left:${pct}%;width:2px;height:${parseInt(sc.height) + 4}px;` +
        "background:#d1d5db;border-radius:1px;";
      trackBg.appendChild(tick);
    }
  }

  trackContainer.appendChild(trackBg);

  // Thumb(s)
  const thumbs: Array<{
    el: HTMLElement;
    input: HTMLInputElement;
    type: "lower" | "upper";
  }> = [];

  const createThumb = (type: "lower" | "upper"): { el: HTMLElement; input: HTMLInputElement } => {
    const thumb = document.createElement("div");
    thumb.className = `slider-thumb ${type}`;
    thumb.tabIndex = disabled ? -1 : 0;
    thumb.setAttribute("role", "slider");
    thumb.setAttribute("aria-valuemin", String(min));
    thumb.setAttribute("aria-valuemax", String(max));
    thumb.setAttribute("aria-orientation", "horizontal");
    thumb.style.cssText =
      `position:absolute;top:50%;transform:translate(-50%,-50%);` +
      `width:${sc.thumbSize};height:${sc.thumbSize};` +
      "border-radius:50%;background:#fff;border:2px solid " + vc.active + ";" +
      "box-shadow:0 1px 4px rgba(0,0,0,0.15);cursor:grab;" +
      "transition:box-shadow 0.12s,z-index 0s;" +
      (disabled ? "opacity:0.5;cursor:not-allowed;" : "");

    // Value bubble
    let bubble: HTMLElement | null = null;
    if (showValueLabel) {
      bubble = document.createElement("div");
      bubble.className = "slider-bubble";
      bubble.style.cssText =
        "position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);" +
        "padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;" +
        `color:#fff;background:${vc.active};white-space:nowrap;opacity:0;transition:opacity 0.12s;`;
      thumb.appendChild(bubble);
    }

    const input = document.createElement("input");
    input.type = "range";
    input.name = name ?? "";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(type === "lower" ? _values[0] : _values[1]);
    input.disabled = disabled;
    input.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;pointer-events:none;";
    thumb.appendChild(input);

    // Hover/focus effects
    if (!disabled) {
      thumb.addEventListener("mouseenter", () => {
        thumb.style.boxShadow = "0 0 0 3px " + vc.active + "30";
        if (bubble) bubble.style.opacity = "1";
      });
      thumb.addEventListener("mouseleave", () => {
        if (!_dragging) {
          thumb.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
          if (bubble) bubble.style.opacity = "0";
        }
      });
      thumb.addEventListener("focus", () => {
        thumb.style.boxShadow = "0 0 0 3px " + vc.active + "30";
        if (bubble) bubble.style.opacity = "1";
      });
      thumb.addEventListener("blur", () => {
        if (!_dragging) {
          thumb.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
          if (bubble) bubble.style.opacity = "0";
        }
      });
    }

    return { el: thumb, input, type };
  };

  // Create lower thumb (always)
  const lowerThumb = createThumb("lower");
  thumbs.push(lowerThumb);
  trackContainer.appendChild(lowerThumb.el);

  // Create upper thumb (range mode only)
  let upperThumb: ReturnType<typeof createThumb> | null = null;
  if (range) {
    upperThumb = createThumb("upper");
    thumbs.push(upperThumb);
    trackContainer.appendChild(upperThumb.el);
  }

  root.appendChild(trackContainer);

  // --- Internal Helpers ---

  function snapValue(val: number): number {
    if (step <= 0) return val;
    const snapped = Math.round((val - min) / step) * step + min;
    return Math.max(min, Math.min(max, snapped));
  }

  function valueToPercent(val: number): number {
    return ((val - min) / (max - min)) * 100;
  }

  function percentToValue(pct: number): number {
    return snapValue(min + (pct / 100) * (max - min));
  }

  function getPosition(e: MouseEvent | TouchEvent): number {
    const rect = trackBg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function updateVisuals(): void {
    const lowerPct = valueToPercent(_values[0]);
    const upperPct = range ? valueToPercent(_values[1]) : lowerPct;

    fill.style.left = `${lowerPct}%`;
    fill.style.width = `${upperPct - lowerPct}%`;

    // Position thumbs
    lowerThumb.el.style.left = `${lowerPct}%`;
    lowerThumb.input.value = String(_values[0]);
    lowerThumb.el.setAttribute("aria-valuenow", String(_values[0]));

    if (range && upperThumb) {
      upperThumb.el.style.left = `${upperPct}%`;
      upperThumb.input.value = String(_values[1]);
      upperThumb.el.setAttribute("aria-valuenow", String(_values[1]));
    }

    // Update bubbles
    thumbs.forEach((t) => {
      const bubble = t.el.querySelector(".slider-bubble") as HTMLElement | null;
      if (bubble) {
        const val = t.type === "lower" ? _values[0] : _values[1];
        bubble.textContent = formatValue ? formatValue(val) : String(val);
      }
    });

    // Update value display in header
    const vd = (root as unknown as { _valueDisplay?: HTMLElement })._valueDisplay;
    if (vd) updateValueDisplay(vd);
  }

  function updateValueDisplay(el: HTMLElement): void {
    if (range) {
      el.textContent = (formatValue ? formatValue(_values[0]) : String(_values[0])) +
        " \u2013 " + (formatValue ? formatValue(_values[1]) : String(_values[1]));
    } else {
      el.textContent = formatValue ? formatValue(_values[0]) : String(_values[0]);
    }
  }

  function emitChange(): void {
    const val = range ? [..._values] as [number, number] : _values[0];
    onChange?.(val as number | [number, number]);
  }

  function emitChangeEnd(): void {
    const val = range ? [..._values] as [number, number] : _values[0];
    onChangeEnd?.(val as number | [number, number]);
  }

  // --- Drag Handling ---

  function startDrag(type: "lower" | "upper", e: MouseEvent | TouchEvent): void {
    if (disabled) return;
    e.preventDefault();
    _dragging = type;

    const thumb = type === "lower" ? lowerThumb : upperThumb!;
    thumb.el.style.cursor = "grabbing";
    thumb.el.style.zIndex = "2";

    const onMove = (ev: MouseEvent | TouchEvent): void => {
      const pct = getPosition(ev) * 100;
      const newVal = percentToValue(pct);

      if (type === "lower") {
        _values[0] = range ? Math.min(newVal, _values[1] - step) : newVal;
      } else {
        _values[1] = Math.max(newVal, _values[0] + step);
      }

      updateVisuals();
      emitChange();
    };

    const onUp = (): void => {
      _dragging = null;
      thumb.el.style.cursor = "grab";
      thumb.el.style.zIndex = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
      emitChangeEnd();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);

    // Initial move
    onMove(e);
  }

  // Attach drag events to each thumb
  thumbs.forEach((t) => {
    t.el.addEventListener("mousedown", (e) => startDrag(t.type, e));
    t.el.addEventListener("touchstart", (e) => startDrag(t.type, e), { passive: false });
  });

  // Click on track to jump
  trackBg.addEventListener("click", (e) => {
    if (disabled) return;
    const pct = getPosition(e) * 100;
    const newVal = percentToValue(pct);

    if (range) {
      // Determine which handle is closer
      const distLower = Math.abs(pct - valueToPercent(_values[0]));
      const distUpper = Math.abs(pct - valueToPercent(_values[1]));
      if (distLower < distUpper) {
        _values[0] = Math.min(newVal, _values[1] - step);
      } else {
        _values[1] = Math.max(newVal, _values[0] + step);
      }
    } else {
      _values[0] = newVal;
    }

    updateVisuals();
    emitChange();
    emitChangeEnd();
  });

  // Keyboard support
  thumbs.forEach((t) => {
    t.el.addEventListener("keydown", (e) => {
      if (disabled) return;
      const stepAmount = e.shiftKey ? step * 10 : step;
      let delta = 0;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          delta = stepAmount;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          delta = -stepAmount;
          break;
        case "Home":
          delta = t.type === "lower" ? min - _values[0] : min - _values[1];
          break;
        case "End":
          delta = t.type === "lower" ? max - _values[0] : max - _values[1];
          break;
        default:
          return;
      }

      e.preventDefault();

      if (t.type === "lower") {
        _values[0] = range ? Math.max(min, Math.min(_values[1] - step, _values[0] + delta)) : snapValue(_values[0] + delta);
      } else {
        _values[1] = Math.min(max, Math.max(_values[0] + step, _values[1] + delta));
      }

      updateVisuals();
      emitChange();
      emitChangeEnd();
    });
  });

  // Initial render
  updateVisuals();

  // --- Instance ---

  return {
    el: root,

    getValue() {
      return range ? ([..._values] as [number, number]) : _values[0];
    },

    setValue(val) {
      if (Array.isArray(val)) {
        _values = [snapValue(val[0]), snapValue(val[1])];
        if (_values[0] > _values[1]) [_values[0], _values[1]] = [_values[1], _values[0]];
      } else {
        _values = [snapValue(val), snapValue(val)];
      }
      updateVisuals();
    },

    getMin() { return min; },
    setMin(m: number) { min = m; updateVisuals(); },
    getMax() { return max; },
    setMax(m: number) { max = m; updateVisuals(); },

    setDisabled(d: boolean) {
      disabled = d;
      thumbs.forEach((t) => {
        t.input.disabled = d;
        t.el.style.opacity = d ? "0.5" : "1";
        t.el.style.cursor = d ? "not-allowed" : "grab";
        t.el.tabIndex = d ? -1 : 0;
      });
    },

    focus() { lowerThumb.el.focus(); },
    destroy() { root.remove(); },
  };
}
