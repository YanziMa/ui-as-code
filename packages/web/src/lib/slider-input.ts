/**
 * Slider / Range Input: Custom range slider with multiple handles (range),
 * step snapping, tick marks, labels, value tooltip, keyboard support,
 * vertical orientation, disabled state, and formatted value display.
 */

// --- Types ---

export type SliderOrientation = "horizontal" | "vertical";
export type SliderVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface SliderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Initial value(s) */
  value?: number | [number, number];
  /** Single or range mode? (auto-detected from value) */
  mode?: "single" | "range";
  /** Orientation */
  orientation?: SliderOrientation;
  /** Visual variant */
  variant?: SliderVariant;
  /** Show tick marks? */
  showTicks?: boolean;
  /** Tick count (auto-calculated if not set) */
  tickCount?: number;
  /** Show labels on ticks? */
  showLabels?: boolean;
  /** Custom label formatter */
  formatValue?: (value: number) => string;
  /** Show value tooltip/bubble on drag? */
  showTooltip?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Track height/width in px */
  trackSize?: number;
  /** Thumb size in px */
  thumbSize?: number;
  /** Callback on value change (during drag) */
  onChange?: (value: number | [number, number]) => void;
  /** Callback on drag end */
  onCommit?: (value: number | [number, number]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SliderInstance {
  element: HTMLElement;
  getValue: () => number | [number, number];
  setValue: (value: number | [number, number]) => void;
  getMin: () => number;
  getMax: () => number;
  setMin: (min: number) => void;
  setMax: (max: number) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Variant Colors ---

const VARIANT_COLORS: Record<SliderVariant, { track: string; fill: string; thumb: string }> = {
  default:  { track: "#e5e7eb", fill: "#6366f1", thumb: "#fff" },
  primary:  { track: "#c7d2fe", fill: "#4338ca", thumb: "#fff" },
  success:  { track: "#bbf7d0", fill: "#16a34a", thumb: "#fff" },
  warning:  { track: "#fde68a", fill: "#d97706", thumb: "#fff" },
  danger:   { track: "#fecaca", fill: "#dc2626", thumb: "#fff" },
};

// --- Helpers ---

function snapToStep(value: number, min: number, max: number, step: number): number {
  const snapped = Math.round((value - min) / step) * step + min;
  return Math.max(min, Math.min(max, snapped));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function valueToPercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

function percentToValue(percent: number, min: number, max: number): number {
  return min + (percent / 100) * (max - min);
}

// --- Main Factory ---

export function createSlider(options: SliderOptions): SliderInstance {
  const opts = {
    min: options.min ?? 0,
    max: options.max ?? 100,
    step: options.step ?? 1,
    mode: "single" as "single" | "range",
    orientation: options.orientation ?? "horizontal",
    variant: options.variant ?? "default",
    showTicks: options.showTicks ?? false,
    tickCount: options.tickCount,
    showLabels: options.showLabels ?? false,
    showTooltip: options.showTooltip ?? true,
    disabled: options.disabled ?? false,
    trackSize: options.trackSize ?? 6,
    thumbSize: options.thumbSize ?? 20,
    formatValue: options.formatValue ?? ((v: number) => String(Math.round(v))),
    className: options.className ?? "",
    ...options,
  };

  // Detect mode from initial value
  if (Array.isArray(options.value)) {
    opts.mode = "range";
  }

  const vc = VARIANT_COLORS[opts.variant];
  const isVert = opts.orientation === "vertical";

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SliderInput: container not found");

  container.className = `slider slider-${opts.orientation} ${opts.className}`;
  container.style.cssText = `
    position:relative;display:${isVert ? "inline-flex" : "block"};
    ${isVert ? `height:${(opts.max - opts.min) / opts.step * 30 + 40}px;` : ""}
    user-select:none;-webkit-user-select:none;font-family:-apple-system,sans-serif;
    touch-action:none;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;

  // State
  let values: [number, number] = Array.isArray(options.value)
    ? [options.value[0]!, options.value[1]!]
    : [options.value ?? opts.min, options.value ?? opts.max];
  let activeHandle: 0 | 1 = 0; // Which handle is being dragged (for range mode)
  let isDragging = false;
  let destroyed = false;

  // Ensure values are within bounds and snapped
  values[0] = snapToStep(values[0], opts.min, opts.max, opts.step);
  values[1] = snapToStep(values[1], opts.min, opts.max, opts.step);
  if (values[0] > values[1]) [values[0], values[1]] = [values[1], values[0]];

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = "slider-root";
  root.style.cssText = `
    position:relative;${isVert ? "height:100%;" : "width:100%;min-width:200px;"}
    display:flex;${isVert ? "flex-direction:column;align-items:center;" : "align-items:center;"}
  `;
  container.appendChild(root);

  // Track background
  const trackBg = document.createElement("div");
  trackBg.className = "slider-track-bg";
  const trackLen = isVert ? "height" : "width";
  const crossLen = isVert ? "width" : "height";
  trackBg.style.cssText = `
    position:relative;background:${vc.track};border-radius:${opts.trackSize / 2}px;
    ${trackLen}:100%;${crossLen}:${opts.trackSize}px;
    cursor:pointer;
  `;
  root.appendChild(trackBg);

  // Filled portion
  const trackFill = document.createElement("div");
  trackFill.className = "slider-track-fill";
  trackFill.style.cssText = `
    position:absolute;background:${vc.fill};border-radius:${opts.trackSize / 2}px;
    ${isVert ? "bottom:0;width:100%;" : "left:0;height:100%;"}
    transition:${isDraggable() ? "none" : `${trackLen} 0.15s ease`};
  `;
  trackBg.appendChild(trackFill);

  // Ticks container
  let ticksContainer: HTMLElement | null = null;
  if (opts.showTicks) {
    ticksContainer = document.createElement("div");
    ticksContainer.className = "slider-ticks";
    ticksContainer.style.cssText = `
      position:absolute;inset:0;pointer-events:none;
      display:flex;${isVert ? "flex-direction:column;" : "flex-direction:row;"}
      justify-content:space-between;
    `;
    trackBg.appendChild(ticksContainer);
  }

  // Thumbs
  const thumbs: HTMLDivElement[] = [];
  const thumbCount = opts.mode === "range" ? 2 : 1;

  for (let i = 0; i < thumbCount; i++) {
    const thumb = document.createElement("div");
    thumb.className = `slider-thumb slider-thumb-${i}`;
    thumb.dataset.handleIndex = String(i);
    thumb.style.cssText = `
      position:absolute;${isVert ? "left:50%;transform:translateX(-50%);" : "top:50%;transform:translateY(-50%);"}
      width:${opts.thumbSize}px;height:${opts.thumbSize}px;border-radius:50%;
      background:${vc.thumb};border:2px solid ${vc.fill};
      box-shadow:0 1px 4px rgba(0,0,0,0.15),0 0 0 3px rgba(99,102,241,0.15);
      cursor:grab;z-index:2;
      transition:${isDraggable() ? "none" : `${isVert ? "bottom" : "left"} 0.1s ease`};
      ${opts.disabled ? "cursor:not-allowed;" : ""}
    `;

    // Tooltip bubble
    if (opts.showTooltip) {
      const tooltip = document.createElement("div");
      tooltip.className = "slider-tooltip";
      tooltip.style.cssText = `
        position:absolute;${isVert ? "left:calc(100% + 8px);top:50%;transform:translateY(-50%);" : "bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);"}
        background:#111827;color:#fff;padding:3px 8px;border-radius:5px;
        font-size:11px;font-weight:600;white-space:nowrap;pointer-events:none;
        opacity:0;transition:opacity 0.15s;z-index:10;
      `;
      tooltip.textContent = opts.formatValue(values[i]!);
      thumb.appendChild(tooltip);

      thumb.addEventListener("mouseenter", () => { (tooltip as HTMLElement).style.opacity = "1"; });
      thumb.addEventListener("mouseleave", () => { if (!isDragging) (tooltip as HTMLElement).style.opacity = "0"; });
    }

    thumbs.push(thumb);
    root.appendChild(thumb);
  }

  // Value labels at ends
  const minLabel = document.createElement("span");
  minLabel.className = "slider-label-min";
  minLabel.textContent = opts.formatValue(opts.min);
  minLabel.style.cssText = `font-size:11px;color:#9ca3af;margin-${isVert ? "bottom" : "right"}:4px;`;

  const maxLabel = document.createElement("span");
  maxLabel.className = "slider-label-max";
  maxLabel.textContent = opts.formatValue(opts.max);
  maxLabel.style.cssText = `font-size:11px;color:#9ca3af;margin-${isVert ? "top" : "left"}:4px;`;

  if (!isVert) {
    const labelsRow = document.createElement("div");
    labelsRow.style.cssText = "display:flex;justify-content:space-between;margin-top:4px;";
    labelsRow.append(minLabel, maxLabel);
    root.appendChild(labelsRow);
  } else {
    root.prepend(maxLabel);
    root.append(minLabel);
  }

  // --- Rendering ---

  function render(): void {
    // Update fill
    const p0 = valueToPercent(values[0], opts.min, opts.max);
    const p1 = valueToPercent(values[1], opts.min, opts.max);

    if (isVert) {
      trackFill.style.height = `${p1 - p0}%`;
      trackFill.style.bottom = `${p0}%`;
    } else {
      trackFill.style.width = `${p1 - p0}%`;
      trackFill.style.left = `${p0}%`;
    }

    // Update thumb positions
    for (let i = 0; i < thumbs.length; i++) {
      const pos = valueToPercent(values[i]!, opts.min, opts.max);
      if (isVert) {
        thumbs[i]!.style.bottom = `${pos}%`;
      } else {
        thumbs[i]!.style.left = `${pos}%`;
      }

      // Update tooltip text
      const tooltip = thumbs[i]!.querySelector(".slider-tooltip") as HTMLElement | null;
      if (tooltip) tooltip.textContent = opts.formatValue(values[i]!);
    }
  }

  function renderTicks(): void {
    if (!ticksContainer) return;

    const count = opts.tickCount ?? Math.round((opts.max - opts.min) / opts.step) + 1;
    ticksContainer.innerHTML = "";

    for (let i = 0; i < count; i++) {
      const val = opts.min + (i * (opts.max - opts.min)) / (count - 1);
      const tick = document.createElement("div");
      tick.style.cssText = `
        ${isVert ? "width:6px;height:2px;border-radius:1px;" : "width:2px;height:6px;border-radius:1px;"}
        background:#d1d5db;flex-shrink:0;
      `;
      ticksContainer.appendChild(tick);

      if (opts.showLabels && (i === 0 || i === count - 1 || count <= 10)) {
        const lbl = document.createElement("span");
        lbl.textContent = opts.formatValue(val);
        lbl.style.cssText = `font-size:9px;color:#b0b4ba;position:absolute;${isVert ? "right:12px;top:50%;transform:translateY(-50%);" : "bottom:12px;left:50%;transform:translateX(-50%);"}white-space:nowrap;`;
        tick.style.position = "relative";
        tick.appendChild(lbl);
      }
    }
  }

  function isDraggable(): boolean {
    return isDragging;
  }

  // --- Interaction ---

  function getPositionFromEvent(e: MouseEvent | TouchEvent): number {
    const rect = trackBg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    if (isVert) {
      const y = clientY - rect.top;
      return 1 - (y / rect.height); // Invert because bottom=0 in CSS
    }
    return (clientX - rect.left) / rect.width;
  }

  function handleMove(clientPos: number): void {
    const rawVal = percentToValue(clientPos * 100, opts.min, opts.max);
    const newVal = snapToStep(rawVal, opts.min, opts.max, opts.step);

    if (opts.mode === "range") {
      values[activeHandle] = newVal;
      // Prevent crossing
      if (activeHandle === 0 && newVal > values[1]) values[0] = values[1];
      if (activeHandle === 1 && newVal < values[0]) values[1] = values[0];
    } else {
      values[0] = newVal;
      values[1] = newVal;
    }

    render();
    opts.onChange?.(getOutputValue());
  }

  function getOutputValue(): number | [number, number] {
    return opts.mode === "range"
      ? [values[0], values[1]]
      : values[0];
  }

  // Mouse events
  function onPointerDown(e: MouseEvent, handleIdx: number): void {
    if (opts.disabled || destroyed) return;
    e.preventDefault();

    isDragging = true;
    activeHandle = handleIdx as 0 | 1;

    const thumb = thumbs[handleIdx]!;
    thumb.style.cursor = "grabbing";
    thumb.style.zIndex = "3";

    // Show tooltips while dragging
    thumbs.forEach((t) => {
      const tt = t.querySelector(".slider-tooltip") as HTMLElement | null;
      if (tt) tt.style.opacity = "1";
    });

    handleMove(getPositionFromEvent(e));

    const onMove = (ev: MouseEvent) => handleMove(getPositionFromEvent(ev));
    const onUp = () => {
      isDragging = false;
      thumb.style.cursor = "grab";
      thumb.style.zIndex = "2";

      thumbs.forEach((t) => {
        const tt = t.querySelector(".slider-tooltip") as HTMLElement | null;
        if (tt) tt.style.opacity = "0";
      });

      opts.onCommit?.(getOutputValue());
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Attach to thumbs
  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener("mousedown", (e) => onPointerDown(e, idx));

    // Touch support
    thumb.addEventListener("touchstart", (e: TouchEvent) => {
      if (opts.disabled || destroyed) return;
      e.preventDefault();
      isDragging = true;
      activeHandle = idx as 0 | 1;

      const onTouchMove = (te: TouchEvent) => handleMove(getPositionFromEvent(te));
      const onTouchEnd = () => {
        isDragging = false;
        opts.onCommit?.(getOutputValue());
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
      };

      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
      handleMove(getPositionFromEvent(e));
    }, { passive: false });
  });

  // Click on track to jump
  trackBg.addEventListener("click", (e: MouseEvent) => {
    if (opts.disabled || destroyed) return;
    const pos = getPositionFromEvent(e);
    const val = snapToStep(percentToValue(pos * 100, opts.min, opts.max), opts.min, opts.max, opts.step);

    if (opts.mode === "range") {
      // Determine which handle to move (closest one)
      const dist0 = Math.abs(val - values[0]);
      const dist1 = Math.abs(val - values[1]);
      if (dist0 <= dist1) values[0] = val;
      else values[1] = val;
    } else {
      values[0] = val;
      values[1] = val;
    }

    render();
    opts.onChange?.(getOutputValue());
    opts.onCommit?.(getOutputValue());
  });

  // Keyboard support
  container.tabIndex = 0;
  container.setAttribute("role", "slider");
  container.setAttribute("aria-valuemin", String(opts.min));
  container.setAttribute("aria-valuemax", String(opts.max));

  container.addEventListener("keydown", (e: KeyboardEvent) => {
    if (opts.disabled || destroyed) return;

    const delta = e.shiftKey ? opts.step * 10 : opts.step;
    let handled = true;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        if (opts.mode === "range") {
          values[activeHandle] = clamp(values[activeHandle] + delta, opts.min, opts.max);
          if (activeHandle === 0 && values[0] > values[1]) values[0] = values[1];
          if (activeHandle === 1 && values[1] < values[0]) values[1] = values[0];
        } else {
          values[0] = clamp(values[0] + delta, opts.min, opts.max);
          values[1] = values[0];
        }
        break;
      case "ArrowLeft":
      case "ArrowDown":
        if (opts.mode === "range") {
          values[activeHandle] = clamp(values[activeHandle] - delta, opts.min, opts.max);
          if (activeHandle === 0 && values[0] > values[1]) values[0] = values[1];
          if (activeHandle === 1 && values[1] < values[0]) values[1] = values[0];
        } else {
          values[0] = clamp(values[0] - delta, opts.min, opts.max);
          values[1] = values[0];
        }
        break;
      case "Home":
        if (opts.mode === "range") values[activeHandle] = opts.min;
        else { values[0] = opts.min; values[1] = opts.min; }
        break;
      case "End":
        if (opts.mode === "range") values[activeHandle] = opts.max;
        else { values[0] = opts.max; values[1] = opts.max; }
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      render();
      opts.onChange?.(getOutputValue());
      opts.onCommit?.(getOutputValue());
    }
  });

  // Initial render
  render();
  if (opts.showTicks) renderTicks();

  const instance: SliderInstance = {
    element: container,

    getValue: () => getOutputValue(),

    setValue(value: number | [number, number]) {
      if (Array.isArray(value)) {
        values[0] = snapToStep(value[0], opts.min, opts.max, opts.step);
        values[1] = snapToStep(value[1], opts.min, opts.max, opts.step);
        if (values[0] > values[1]) [values[0], values[1]] = [values[1], values[0]];
      } else {
        const v = snapToStep(value, opts.min, opts.max, opts.step);
        values = [v, v];
      }
      render();
    },

    getMin: () => opts.min,
    getMax: () => opts.max,

    setMin(min: number) {
      opts.min = min;
      if (values[0] < min) values[0] = min;
      if (values[1] < min) values[1] = min;
      render();
    },

    setMax(max: number) {
      opts.max = max;
      if (values[0] > max) values[0] = max;
      if (values[1] > max) values[1] = max;
      render();
    },

    disable() {
      opts.disabled = true;
      container.style.opacity = "0.5";
      container.style.pointerEvents = "none";
    },

    enable() {
      opts.disabled = false;
      container.style.opacity = "";
      container.style.pointerEvents = "";
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
