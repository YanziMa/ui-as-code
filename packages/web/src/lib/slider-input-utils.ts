/**
 * Slider Input Utilities: Custom range slider with dual handles (range),
 * step snapping, tick marks, value labels, tooltip on drag, keyboard
 * support, vertical mode, and formatted output.
 */

// --- Types ---

export type SliderOrientation = "horizontal" | "vertical";
export type SliderTrackStyle = "default" | "filled" | "segmented";

export interface SliderOptions {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Initial value (single slider) or [min, max] for range */
  value?: number | [number, number];
  /** Range/dual-handle mode? */
  range?: boolean;
  /** Orientation */
  orientation?: SliderOrientation;
  /** Track style variant */
  trackStyle?: SliderTrackStyle;
  /** Show tick marks? */
  showTicks?: boolean;
  /** Tick count (auto-calculated if omitted) */
  tickCount?: number;
  /** Show value label(s)? */
  showValue?: boolean;
  /** Show tooltip while dragging? */
  showTooltip?: boolean;
  /** Value format function */
  formatValue?: (value: number) => string;
  /** Disabled state */
  disabled?: boolean;
  /** Track color */
  color?: string;
  /** Height/width of the slider in px */
  size?: number;
  /** Label text */
  label?: string;
  /** Called when value changes */
  onChange?: (value: number | [number, number]) => void;
  /** Called while dragging (continuous) */
  onInput?: (value: number | [number, number]) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface SliderInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current value */
  getValue: () => number | [number, number];
  /** Set value programmatically */
  setValue: (value: number | [number, number]) => void;
  /** Set minimum value (range mode) */
  setMin: (value: number) => void;
  /** Set maximum value (value mode) */
  setMax: (value: number) => void;
  /** Get the internal range input element(s) */
  getInput: () => HTMLInputElement | [HTMLInputElement, HTMLInputElement];
  /** Disable/enable */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a custom range slider.
 *
 * @example
 * ```ts
 * // Single slider
 * const slider = createSlider({ min: 0, max: 100, value: 50 });
 *
 * // Range slider
 * const range = createSlider({
 *   range: true,
 *   min: 0,
 *   max: 1000,
 *   value: [200, 800],
 *   onChange: (v) => console.log(v),
 * });
 * ```
 */
export function createSlider(options: SliderOptions = {}): SliderInstance {
  const {
    min = 0,
    max = 100,
    step = 1,
    value: initialValue,
    range = false,
    orientation = "horizontal",
    trackStyle = "default",
    showTicks = false,
    tickCount,
    showValue = true,
    showTooltip = true,
    formatValue,
    disabled = false,
    color = "#3b82f6",
    size = orientation === "horizontal" ? 200 : 200,
    label,
    onChange,
    onInput,
    className,
    container,
  } = options;

  let _values: [number, number] = range
    ? (Array.isArray(initialValue) ? initialValue : [min, max])
    : [(typeof initialValue === "number" ? initialValue : min), max];

  // Clamp values
  _values[0] = snapToStep(Math.max(min, Math.min(_values[0], max)));
  _values[1] = snapToStep(Math.max(_values[0], Math.min(_values[1], max)));

  let isDragging = false;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `slider-wrapper ${orientation} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:inline-flex;${orientation === "horizontal" ? "flex-direction:column;gap:8px;" : "flex-direction:row;gap:8px;align-items:center;"}`;

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
    root.appendChild(labelEl);
  }

  // Slider container (track + thumbs)
  const sliderContainer = document.createElement("div");
  sliderContainer.className = "slider-container";
  const isH = orientation === "horizontal";
  sliderContainer.style.cssText =
    `position:relative;${isH ? `width:${size}px;height:24px` : `width:24px;height:${size}px`};` +
    "display:flex;align-items:center;" +
    (isH ? "" : "flex-direction:column;") +
    (disabled ? "opacity:0.5;pointer-events:none;" : "");

  // Track background
  const trackBg = document.createElement("div");
  trackBg.className = "slider-track-bg";
  trackBg.style.cssText =
    `${isH ? "width" : "height"}:100%;${isH ? "height" : "width"}:6px;border-radius:3px;background:#e5e7eb;position:relative;`;

  // Filled portion of track
  const trackFill = document.createElement("div");
  trackFill.className = "slider-track-fill";
  trackFill.style.cssText =
    "position:absolute;border-radius:3px;background:" + color +
    ";transition:none;";

  // Thumbs
  const thumbMin = createThumb();
  const thumbMax = range ? createThumb() : null;

  function createThumb(): HTMLElement {
    const t = document.createElement("div");
    t.className = "slider-thumb";
    t.style.cssText =
      `width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid ${color};` +
      "box-shadow:0 1px 3px rgba(0,0,0,0.2);position:absolute;z-index:2;" +
      "cursor:grab;transition:box-shadow 0.12s, transform 0.12s;" +
      (isH ? "top:50%;transform:translate(-50%, -50%);" : "left:50%;transform:translate(-50%, -50%);");
    t.addEventListener("mouseenter", () => { if (!isDragging) { t.style.boxShadow = `0 0 0 4px ${color}33`; t.style.transform += " scale(1.15)"; }});
    t.addEventListener("mouseleave", () => { if (!isDragging) { t.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)"; t.style.transform = isH ? "translate(-50%, -50%)" : "translate(-50%, -50%)"; }});
    return t;
  }

  // Tooltip
  let tooltipEl: HTMLElement | null = null;
  if (showTooltip) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "slider-tooltip";
    tooltipEl.style.cssText =
      "position:absolute;padding:4px 8px;background:#111827;color:#fff;font-size:11px;" +
      "border-radius:4px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.12s;z-index:10;";
    sliderContainer.appendChild(tooltipEl);
  }

  // Assemble track
  trackBg.appendChild(trackFill);
  trackBg.appendChild(thumbMin);
  if (thumbMax) trackBg.appendChild(thumbMax);
  sliderContainer.appendChild(trackBg);

  // Ticks
  if (showTicks) {
    const ticksContainer = document.createElement("div");
    ticksContainer.className = "slider-ticks";
    ticksContainer.style.cssText =
      `position:absolute;inset:0;pointer-events:none;display:flex;${isH ? "flex-direction:row" : "flex-direction:column"};justify-content:space-between;`;

    const count = tickCount ?? Math.min(20, Math.floor((max - min) / step) + 1);
    for (let i = 0; i < count; i++) {
      const tick = document.createElement("span");
      tick.style.cssText =
        `${isH ? "width" : "height"}:1px;${isH ? "height" : "width"}:8px;background:#d1d5db;border-radius:1px;align-self:${isH ? "stretch" : "stretch"};`;
      ticksContainer.appendChild(tick);
    }
    sliderContainer.appendChild(ticksContainer);
  }

  root.appendChild(sliderContainer);

  // Value display
  let valueDisplay: HTMLElement | null = null;
  if (showValue) {
    valueDisplay = document.createElement("div");
    valueDisplay.className = "slider-value-display";
    valueDisplay.style.cssText = "font-size:13px;font-weight:600;color:#374151;text-align:center;min-width:60px;";
    updateValueDisplay();
    root.appendChild(valueDisplay);
  }

  (container ?? document.body).appendChild(root);

  // --- Internal Helpers ---

  function snapToStep(val: number): number {
    return Math.round(val / step) * step;
  }

  function percentOf(value: number): number {
    return ((value - min) / (max - min)) * 100;
  }

  function valueFromPercent(percent: number): number {
    return snapToStep(min + (percent / 100) * (max - min));
  }

  function fmt(value: number): string {
    return formatValue ? formatValue(value) : String(Number.isInteger(value) ? value : value.toFixed(2));
  }

  function updateVisuals(): void {
    const pMin = percentOf(_values[0]);
    const pMax = percentOf(_values[1]);

    if (isH) {
      trackFill.style.left = `${pMin}%`;
      trackFill.style.width = `${pMax - pMin}%`;
      thumbMin.style.left = `${pMin}%`;
      if (thumbMax) thumbMax.style.left = `${pMax}%`;
    } else {
      trackFill.style.bottom = `${pMin}%`;
      trackFill.style.height = `${pMax - pMin}%`;
      thumbMin.style.bottom = `${pMin}%`;
      if (thumbMax) thumbMax.style.bottom = `${pMax}%`;
    }

    updateValueDisplay();
  }

  function updateValueDisplay(): void {
    if (!valueDisplay) return;
    if (range) {
      valueDisplay.textContent = `${fmt(_values[0])} - ${fmt(_values[1])}`;
    } else {
      valueDisplay.textContent = fmt(_values[0]);
    }
  }

  function showTooltipAt(thumb: HTMLElement, val: number): void {
    if (!tooltipEl) return;
    tooltipEl.textContent = fmt(val);
    tooltipEl.style.opacity = "1";

    const rect = thumb.getBoundingClientRect();
    const containerRect = sliderContainer.getBoundingClientRect();

    if (isH) {
      tooltipEl.style.left = `${rect.left - containerRect.left + rect.width / 2 - tooltipEl.offsetWidth / 2}px`;
      tooltipEl.style.top = "-32px";
    } else {
      tooltipEl.style.left = "32px";
      tooltipEl.style.top = `${rect.top - containerRect.top + rect.height / 2 - tooltipEl.offsetHeight / 2}px`;
    }
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // --- Drag Handling ---

  function setupThumbDrag(thumb: HTMLElement, index: 0 | 1): void {
    const startDrag = (clientX: number, clientY: number): void => {
      if (disabled) return;
      isDragging = true;
      thumb.style.cursor = "grabbing";

      const onMove = (moveX: number, moveY: number): void => {
        const trackRect = trackBg.getBoundingClientRect();
        let percent: number;

        if (isH) {
          percent = ((moveX - trackRect.left) / trackRect.width) * 100;
        } else {
          percent = ((trackRect.bottom - moveY) / trackRect.height) * 100;
        }

        percent = Math.max(0, Math.min(100, percent));
        let newVal = valueFromPercent(percent);

        // Enforce ordering in range mode
        if (range) {
          if (index === 0 && newVal > _values[1]) newVal = _values[1];
          if (index === 1 && newVal < _values[0]) newVal = _values[0];
        }

        _values[index] = newVal;
        updateVisuals();
        showTooltipAt(thumb, newVal);
        onInput?.(range ? [..._values] : _values[0]);
      };

      const onEnd = (): void => {
        isDragging = false;
        thumb.style.cursor = "grab";
        hideTooltip();
        onChange?.(range ? [..._values] : _values[0]);
      };

      const mouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
      const mouseUp = (): void => { onEnd(); document.removeEventListener("mousemove", mouseMove); document.removeEventListener("mouseup", mouseUp); };
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("mouseup", mouseUp);

      const touchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
      const touchEnd = (): void => { onEnd(); document.removeEventListener("touchmove", touchMove); document.removeEventListener("touchend", touchEnd); };
      document.addEventListener("touchmove", touchMove, { passive: false });
      document.addEventListener("touchend", touchEnd);
    };

    thumb.addEventListener("mousedown", (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
    thumb.addEventListener("touchstart", (e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

    // Click on track to jump
    trackBg.addEventListener("click", (e) => {
      if (e.target !== trackBg) return;
      const rect = trackBg.getBoundingClientRect();
      let percent: number;
      if (isH) {
        percent = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        percent = ((rect.bottom - e.clientY) / rect.height) * 100;
      }
      const newVal = valueFromPercent(Math.max(0, Math.min(100, percent)));

      // Determine which handle to move (closest)
      if (range) {
        if (Math.abs(newVal - _values[0]) < Math.abs(newVal - _values[1])) {
          _values[0] = newVal;
        } else {
          _values[1] = newVal;
        }
      } else {
        _values[0] = newVal;
      }
      updateVisuals();
      onChange?.(range ? [..._values] : _values[0]);
    });
  }

  setupThumbDrag(thumbMin, 0);
  if (thumbMax) setupThumbDrag(thumbMax, 1);

  // Keyboard support
  if (!disabled) {
    const keyHandler = (e: KeyboardEvent, targetIndex: 0 | 1): void => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          _values[targetIndex] = snapToStep(Math.min(max, _values[targetIndex] + step));
          if (range && targetIndex === 1 && _values[1] < _values[0]) _values[1] = _values[0];
          if (range && targetIndex === 0 && _values[0] > _values[1]) _values[0] = _values[1];
          updateVisuals();
          onChange?.(range ? [..._values] : _values[0]);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          _values[targetIndex] = snapToStep(Math.max(min, _values[targetIndex] - step));
          if (range && targetIndex === 0 && _values[0] > _values[1]) _values[0] = _values[1];
          if (range && targetIndex === 1 && _values[1] < _values[0]) _values[1] = _values[0];
          updateVisuals();
          onChange?.(range ? [..._values] : _values[0]);
          break;
        case "Home":
          e.preventDefault();
          _values[targetIndex] = min;
          updateVisuals();
          onChange?.(range ? [..._values] : _values[0]);
          break;
        case "End":
          e.preventDefault();
          _values[targetIndex] = max;
          updateVisuals();
          onChange?.(range ? [..._values] : _values[0]);
          break;
      }
    };

    thumbMin.tabIndex = 0;
    thumbMin.setAttribute("role", "slider");
    thumbMin.setAttribute("aria-valuemin", String(min));
    thumbMin.setAttribute("aria-valuemax", String(max));
    thumbMin.addEventListener("keydown", (e) => keyHandler(e, 0));

    if (thumbMax) {
      thumbMax.tabIndex = 0;
      thumbMax.setAttribute("role", "slider");
      thumbMax.setAttribute("aria-valuemin", String(min));
      thumbMax.setAttribute("aria-valuemax", String(max));
      thumbMax.addEventListener("keydown", (e) => keyHandler(e, 1));
    }
  }

  // Initial render
  updateVisuals();

  // --- Public API ---

  function getValue(): number | [number, number] {
    return range ? [..._values] : _values[0];
  }

  function setValue(val: number | [number, number]): void {
    if (Array.isArray(val)) {
      _values[0] = snapToStep(Math.max(min, Math.min(val[0], max)));
      _values[1] = snapToStep(Math.max(_values[0], Math.min(val[1], max)));
    } else {
      _values[0] = snapToStep(Math.max(min, Math.min(val, max)));
    }
    updateVisuals();
  }

  function setMin(val: number): void {
    _values[0] = snapToStep(Math.max(min, Math.min(val, _values[1])));
    updateVisuals();
  }

  function setMax(val: number): void {
    _values[1] = snapToStep(Math.max(_values[0], Math.min(val, max)));
    updateVisuals();
  }

  function getInput(): HTMLInputElement | [HTMLInputElement, HTMLInputElement] {
    // Return synthetic info since we don't use native inputs
    const dummy = document.createElement("input");
    dummy.type = "range";
    dummy.min = String(min);
    dummy.max = String(max);
    dummy.step = String(step);
    dummy.value = String(_values[0]);
    return range ? [dummy, dummy] : dummy;
  }

  function setDisabled(d: boolean): void {
    // Would need to store and re-apply — simplified
    sliderContainer.style.opacity = d ? "0.5" : "";
    sliderContainer.style.pointerEvents = d ? "none" : "";
  }

  function destroy(): void { root.remove(); }

  return { el: root, getValue, setValue, setMin, setMax, getInput, setDisabled, destroy };
}
