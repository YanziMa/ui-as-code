/**
 * Range Slider: Dual-handle range slider with drag, keyboard, step snapping,
 * min/max constraints, value labels, tick marks, disabled state, and ARIA.
 */

// --- Types ---

export interface RangeSliderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Initial values [minVal, maxVal] */
  value?: [number, number];
  /** Step increment (default: 1) */
  step?: number;
  /** Show value labels on handles */
  showLabels?: boolean;
  /** Show tick marks */
  showTicks?: boolean;
  /** Number of tick divisions */
  tickCount?: number;
  /** Format function for labels */
  formatLabel?: (value: number) => string;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Track color */
  trackColor?: string;
  /** Fill color between handles */
  fillColor?: string;
  /** Handle color */
  handleColor?: string;
  /** Handle size in px */
  handleSize?: number;
  /** Track height in px */
  trackHeight?: number;
  /** Push behavior: moving one handle past the other pushes it */
  pushBehavior?: boolean;
  /** Callback on value change */
  onChange?: (values: [number, number]) => void;
  /** Callback on drag start */
  onDragStart?: (handle: "min" | "max") => void;
  /** Callback on drag end */
  onDragEnd?: (values: [number, number]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RangeSliderInstance {
  element: HTMLElement;
  getValue: () => [number, number];
  setValue: (values: [number, number]) => void;
  setMin: (value: number) => void;
  setMax: (value: number) => void;
  getMin: () => number;
  getMax: () => number;
  reset: () => void;
  destroy: () => void;
}

// --- Helpers ---

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function snapToStep(value: number, step: number, min: number): number {
  return Math.round((value - min) / step) * step + min;
}

function formatDefault(value: number): string {
  return String(Math.round(value));
}

// --- Main Factory ---

export function createRangeSlider(options: RangeSliderOptions): RangeSliderInstance {
  const opts = {
    min: options.min ?? 0,
    max: options.max ?? 100,
    step: options.step ?? 1,
    showLabels: options.showLabels ?? true,
    showTicks: options.showTicks ?? false,
    tickCount: options.tickCount ?? 10,
    formatLabel: options.formatLabel ?? formatDefault,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    trackColor: options.trackColor ?? "#e5e7eb",
    fillColor: options.fillColor ?? "#4f46e5",
    handleColor: options.handleColor ?? "#fff",
    handleSize: options.handleSize ?? 18,
    trackHeight: options.trackHeight ?? 6,
    pushBehavior: options.pushBehavior ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RangeSlider: container not found");

  let values: [number, number] = options.value ?? [opts.min, opts.max];
  // Clamp initial
  values[0] = clamp(values[0], opts.min, opts.max);
  values[1] = clamp(values[1], opts.min, opts.max);
  if (values[0] > values[1]) [values[0], values[1]] = [values[1], values[0]];

  let activeHandle: "min" | "max" | null = null;
  let destroyed = false;

  // Build DOM
  container.className = `range-slider ${opts.className}`;
  container.style.cssText = `
    position:relative;width:100%;padding:${opts.handleSize / 2}px 0;
    user-select:none;${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;

  // Track background
  const trackBg = document.createElement("div");
  trackBg.style.cssText = `
    position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);
    height:${opts.trackHeight}px;background:${opts.trackColor};border-radius:${opts.trackHeight / 2}px;
  `;
  container.appendChild(trackBg);

  // Fill (between handles)
  const fill = document.createElement("div");
  fill.style.cssText = `
    position:absolute;height:${opts.trackHeight}px;background:${opts.fillColor};
    border-radius:${opts.trackHeight / 2}px;top:50%;transform:translateY(-50%);
    transition:left 0.05s,width 0.05s;
  `;
  container.appendChild(fill);

  // Ticks
  if (opts.showTicks) {
    const ticksContainer = document.createElement("div");
    ticksContainer.style.cssText = "position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);pointer-events:none;";
    for (let i = 0; i <= opts.tickCount; i++) {
      const tick = document.createElement("div");
      const pct = (i / opts.tickCount) * 100;
      tick.style.cssText = `
        position:absolute;left:${pct}%;width:2px;height:8px;background:#d1d5db;border-radius:1px;
        transform:translateX(-50%);margin-top:${opts.trackHeight / 2 + 4}px;
      `;
      ticksContainer.appendChild(tick);
    }
    container.appendChild(ticksContainer);
  }

  // Min handle
  const minHandle = createHandle("min");
  container.appendChild(minHandle.el);

  // Max handle
  const maxHandle = createHandle("max");
  container.appendChild(maxHandle.el);

  // Min label
  let minLabel: HTMLElement | null = null;
  if (opts.showLabels) {
    minLabel = createLabel();
    container.appendChild(minLabel);
  }

  // Max label
  let maxLabel: HTMLElement | null = null;
  if (opts.showLabels) {
    maxLabel = createLabel();
    container.appendChild(maxLabel);
  }

  function createHandle(type: "min" | "max"): { el: HTMLElement } {
    const el = document.createElement("div");
    el.dataset.handle = type;
    el.setAttribute("role", "slider");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-valuemin", String(opts.min));
    el.setAttribute("aria-valuemax", String(opts.max));
    el.style.cssText = `
      position:absolute;top:50%;transform:translate(-50%,-50%);
      width:${opts.handleSize}px;height:${opts.handleSize}px;
      background:${opts.handleColor};border:2px solid ${opts.fillColor};
      border-radius:50%;cursor:grab;z-index:2;
      box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:box-shadow 0.15s;
      ${opts.readOnly ? "cursor:default;" : ""}
    `;

    if (!opts.readOnly && !opts.disabled) {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        activeHandle = type;
        el.style.cursor = "grabbing";
        el.style.boxShadow = "0 2px 8px rgba(79,70,229,0.3)";
        opts.onDragStart?.(type);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        activeHandle = type;
        opts.onDragStart?.(type);
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd);
      }, { passive: false });

      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.18)";
      });
      el.addEventListener("mouseleave", () => {
        if (activeHandle !== type) {
          el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
        }
      });

      // Keyboard
      el.addEventListener("keydown", (e: KeyboardEvent) => {
        const step = e.shiftKey ? opts.step * 10 : opts.step;
        switch (e.key) {
          case "ArrowRight":
          case "ArrowUp":
            e.preventDefault();
            moveHandle(type, values[type === "min" ? 0 : 1] + step);
            break;
          case "ArrowLeft":
          case "ArrowDown":
            e.preventDefault();
            moveHandle(type, values[type === "min" ? 0 : 1] - step);
            break;
          case "Home":
            e.preventDefault();
            moveHandle(type, opts.min);
            break;
          case "End":
            e.preventDefault();
            moveHandle(type, opts.max);
            break;
        }
      });
    }

    return { el };
  }

  function createLabel(): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute;top:-28px;transform:translateX(-50%);
      padding:2px 8px;background:#374151;color:#fff;font-size:11px;
      font-weight:500;border-radius:4px;white-space:nowrap;
      pointer-events:none;opacity:0;transition:opacity 0.15s;
    `;
    // Arrow
    const arrow = document.createElement("div");
    arrow.style.cssText = "position:absolute;bottom:-4px;left:50%;transform:translateX(-50%) rotate(45deg);width:6px;height:6px;background:#374151;";
    el.appendChild(arrow);
    return el;
  }

  function valueToPercent(value: number): number {
    return ((value - opts.min) / (opts.max - opts.min)) * 100;
  }

  function percentToValue(pct: number): number {
    return snapToStep(opts.min + (pct / 100) * (opts.max - opts.min), opts.step, opts.min);
  }

  function getTrackWidth(): number {
    return container.clientWidth - opts.handleSize;
  }

  function updateUI(): void {
    const trackW = getTrackWidth();
    const minPct = valueToPercent(values[0]);
    const maxPct = valueToPercent(values[1]);

    const offset = opts.handleSize / 2;
    minHandle.el.style.left = `${offset + (minPct / 100) * trackW}px`;
    maxHandle.el.style.left = `${offset + (maxPct / 100) * trackW}px`;

    fill.style.left = `${offset + (minPct / 100) * trackW}px`;
    fill.style.width = `${((maxPct - minPct) / 100) * trackW}px`;

    // Update ARIA
    minHandle.el.setAttribute("aria-valuenow", String(Math.round(values[0])));
    maxHandle.el.setAttribute("aria-valuenow", String(Math.round(values[1])));

    // Labels
    if (minLabel) {
      minLabel.textContent = opts.formatLabel(values[0]);
      minLabel.style.left = minHandle.el.style.left;
    }
    if (maxLabel) {
      maxLabel.textContent = opts.formatLabel(values[1]);
      maxLabel.style.left = maxHandle.el.style.left;
    }
  }

  function moveHandle(handle: "min" | "max", newValue: number): void {
    newValue = clamp(newValue, opts.min, opts.max);
    newValue = snapToStep(newValue, opts.step, opts.min);

    if (handle === "min") {
      if (newValue > values[1]) {
        if (opts.pushBehavior) values[1] = newValue;
        else newValue = values[1];
      }
      values[0] = newValue;
    } else {
      if (newValue < values[0]) {
        if (opts.pushBehavior) values[0] = newValue;
        else newValue = values[0];
      }
      values[1] = newValue;
    }

    updateUI();
    opts.onChange?.([...values] as [number, number]);
  }

  function getPositionFromEvent(e: MouseEvent | TouchEvent): number {
    const rect = container.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const offset = opts.handleSize / 2;
    const trackW = rect.width - opts.handleSize;
    const relX = clientX - rect.left - offset;
    return percentToValue((relX / trackW) * 100);
  }

  // Mouse handlers
  function onMouseMove(e: MouseEvent): void {
    if (!activeHandle) return;
    e.preventDefault();
    moveHandle(activeHandle, getPositionFromEvent(e));

    // Show labels on drag
    if (minLabel) minLabel.style.opacity = "1";
    if (maxLabel) maxLabel.style.opacity = "1";
  }

  function onMouseUp(): void {
    if (activeHandle) {
      (activeHandle === "min" ? minHandle : maxHandle).el.style.cursor = "grab";
      (activeHandle === "min" ? minHandle : maxHandle).el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
      opts.onDragEnd?.([...values] as [number, number]);
    }
    activeHandle = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    // Hide labels after delay
    setTimeout(() => {
      if (minLabel) minLabel.style.opacity = "0";
      if (maxLabel) maxLabel.style.opacity = "0";
    }, 800);
  }

  // Touch handlers
  function onTouchMove(e: TouchEvent): void {
    if (!activeHandle) return;
    e.preventDefault();
    moveHandle(activeHandle, getPositionFromEvent(e as unknown as MouseEvent));
  }

  function onTouchEnd(): void {
    if (activeHandle) {
      opts.onDragEnd?.([...values] as [number, number]);
    }
    activeHandle = null;
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
  }

  // Click on track to jump
  container.addEventListener("click", (e) => {
    if (opts.disabled || opts.readOnly || activeHandle) return;
    const clickedValue = getPositionFromEvent(e);
    const midPoint = (values[0] + values[1]) / 2;
    if (clickedValue < midPoint) {
      moveHandle("min", clickedValue);
    } else {
      moveHandle("max", clickedValue);
    }
  });

  // Show/hide labels on hover
  container.addEventListener("mouseenter", () => {
    if (minLabel) minLabel.style.opacity = "1";
    if (maxLabel) maxLabel.style.opacity = "1";
  });
  container.addEventListener("mouseleave", () => {
    if (!activeHandle) {
      if (minLabel) minLabel.style.opacity = "0";
      if (maxLabel) maxLabel.style.opacity = "0";
    }
  });

  // Initial render
  updateUI();

  const instance: RangeSliderInstance = {
    element: container,

    getValue() { return [...values] as [number, number]; },

    setValue(newValues: [number, number]) {
      values[0] = clamp(newValues[0], opts.min, opts.max);
      values[1] = clamp(newValues[1], opts.min, opts.max);
      if (values[0] > values[1]) [values[0], values[1]] = [values[1], values[0]];
      updateUI();
      opts.onChange?.([...values] as [number, number]);
    },

    setMin(value: number) { moveHandle("min", value); },
    setMax(value: number) { moveHandle("max", value); },

    getMin() { return values[0]; },
    getMax() { return values[1]; },

    reset() {
      values = [opts.min, opts.max];
      updateUI();
      opts.onChange?.([...values] as [number, number]);
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
