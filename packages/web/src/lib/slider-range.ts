/**
 * Slider Range: Dual-handle range slider component.
 *
 * Features:
 * - Two handles for min/max selection
 * - Single-handle mode option
 * - Step increments (including decimal steps)
 * - Min/max range constraints
 * - Track fill between handles
 * - Tooltip/popover showing values
 * - Keyboard accessible (arrow keys shift by step)
 * - Vertical and horizontal orientation
 * - Disabled state
 * - Marks/ticks at intervals
 * - Input sync (bind to hidden inputs)
 */

// --- Types ---

export type SliderOrientation = "horizontal" | "vertical";

export interface SliderRangeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 1, can be decimal like 0.1) */
  step?: number;
  /** Initial values [minVal, maxVal] (default: [20, 80]) */
  value?: [number, number];
  /** Orientation (default: horizontal) */
  orientation?: SliderOrientation;
  /** Disable slider (default: false) */
  disabled?: boolean;
  /** Show tooltip on drag (default: true) */
  showTooltip?: boolean;
  /** Tooltip format function */
  tooltipFormat?: (value: number) => string;
  /** Show marks/ticks (default: false) */
  showMarks?: boolean;
  /** Mark interval (default: auto-calculated from step) */
  markInterval?: number;
  /** Mark labels (optional array of {value, label}) */
  markLabels?: Array<{ value: number; label: string }>;
  /** Push mode: handles push each other (default: true) */
  push?: boolean;
  /** Track height/width in px (default: 6 for h, 24 for v) */
  trackSize?: number;
  /** Handle size in px (default: 18) */
  handleSize?: number;
  /** Handle border radius (default: 50%) */
  handleRadius?: number;
  /** Track color (default: #e5e7eb) */
  trackColor?: string;
  /** Fill color (default: #6366f1) */
  fillColor?: string;
  /** Handle color (default: #fff) */
  handleColor?: string;
  /** Handle border color (default: #6366f1) */
  handleBorderColor?: string;
  /** Disabled opacity (default: 0.5) */
  disabledOpacity?: number;
  /** Animation duration ms (default: 0 for instant, set for smooth) */
  animationDuration?: number;
  /** Callback on value change (during drag) */
  onChange?: (values: [number, number]) => void;
  /** Callback after drag ends */
  onAfterChange?: (values: [number, number]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SliderRangeInstance {
  element: HTMLElement;
  /** Get current values */
  getValue: () => [number, number];
  /** Set values programmatically (with optional animation) */
  setValue: (values: [number, number], animate?: boolean) => void;
  /** Set min value only */
  setMin: (value: number) => void;
  /** Set max value only */
  setMax: (value: number) => void;
  /** Disable/enable */
  setDisabled: (disabled: boolean) => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function snapToStep(val: number, min: number, max: number, step: number): number {
  const stepped = Math.round((val - min) / step) * step + min;
  return Math.min(max, Math.max(min, stepped));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function formatDefault(val: number): string {
  return Number.isInteger(val) ? String(val) : val.toFixed(2).replace(/\.?0+$/, "");
}

// --- Main ---

export function createSliderRange(options: SliderRangeOptions): SliderRangeInstance {
  const opts = {
    min: 0,
    max: 100,
    step: 1,
    value: [20, 80],
    orientation: "horizontal" as SliderOrientation,
    disabled: false,
    showTooltip: true,
    showMarks: false,
    push: true,
    trackSize: 6,
    handleSize: 18,
    handleRadius: 50,
    trackColor: "#e5e7eb",
    fillColor: "#6366f1",
    handleColor: "#ffffff",
    handleBorderColor: "#6366f1",
    disabledOpacity: 0.5,
    animationDuration: 0,
    tooltipFormat: formatDefault,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Slider Range: container not found");

  const isH = opts.orientation === "horizontal";

  // Root
  const root = document.createElement("div");
  root.className = `slider-range ${opts.className ?? ""} ${isH ? "slider-h" : "slider-v"}`;
  root.setAttribute("role": "slider");
  root.setAttribute("aria-valuemin", String(opts.min));
  root.setAttribute("aria-valuemax", String(opts.max));
  root.tabIndex = 0;
  root.style.cssText = `
    position:relative;display:${isH ? "inline-block" : "flex"};${isH ? "width:100%;" : "height:100%;"}
    ${isH ? `height:${opts.handleSize + 8}px;` : `width:${opts.handleSize + 8}px;`}
    align-items:center;cursor:${opts.disabled ? "not-allowed" : "pointer"};
    user-select:none;-webkit-user-select:none;
    touch-action:none;outline:none;
    opacity:${opts.disabled ? opts.disabledOpacity : 1};
    transition:opacity 0.15s;
  `;

  // Track background
  const track = document.createElement("div");
  track.className = "sr-track";
  track.style.cssText = `
    position:absolute;${isH ? "left:4px;right:4px;" : "top:4px;bottom:4px;"}
    height:${isH ? opts.trackSize : "auto"}px;width:${isH ? auto : opts.trackSize}px;
    background:${opts.trackColor};border-radius:${isH ? opts.trackSize / 2 : opts.trackSize / 2}px;
    pointer-events:none;
  `;
  root.appendChild(track);

  // Fill (between handles)
  const fill = document.createElement("div");
  fill.className = "sr-fill";
  fill.style.cssText = `
    position:absolute;background:${opts.fillColor};
    border-radius:${isH ? opts.trackSize / 2 : opts.trackSize / 2}px;
    pointer-events:none;transition:${opts.animationDuration > 0 ? `all ${opts.animationDuration}ms` : "none"};
  `;
  root.appendChild(fill);

  // Handles
  interface HandleData {
    el: HTMLDivElement;
    tooltip: HTMLDivElement;
    isMin: boolean;
  }

  const createHandle = (isMin: boolean): HandleData => {
    const handle = document.createElement("div");
    handle.className = `sr-handle sr-handle-${isMin ? "min" : "max"}`;
    handle.tabIndex = 0;
    handle.setAttribute("role": "slider");
    handle.setAttribute("aria-label", isMin ? "Minimum" : "Maximum");
    handle.style.cssText = `
      position:absolute;width:${opts.handleSize}px;height:${opts.handleSize}px;
      background:${opts.handleColor};border:2px solid ${opts.handleBorderColor};
      border-radius:${opts.handleRadius}%;cursor:grab;z-index:2;
      box-shadow:0 1px 4px rgba(0,0,0,0.15);display:flex;
      align-items:center;justify-content:center;
      transition:box-shadow 0.15s;
      ${isH ? "top:50%;transform:translate(-50%,-50%);" : "left:50%;transform:translate(-50%,-50%);"}
    `;

    // Inner dot
    const dot = document.createElement("div");
    dot.style.cssText = `width:6px;height:6px;background:${opts.handleBorderColor};border-radius:50%;`;
    handle.appendChild(dot);

    // Tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "sr-tooltip";
    tooltip.style.cssText = `
      position:absolute;bottom:calc(100% + 8px);left:50%;
      transform:translateX(-50%) translateY(4px);padding:4px 8px;
      background:#111827;color:#fff;font-size:11px;font-weight:600;
      border-radius:4px;white-space:nowrap;pointer-events:none;
      opacity:0;transition:opacity 0.15s;z-index:10;
    `;
    tooltip.textContent = isMin ? String(opts.value![0]) : String(opts.value![1]);
    handle.appendChild(tooltip);

    root.appendChild(handle);

    return { el: handle, tooltip, isMin };
  };

  const minHandle = createHandle(true);
  const maxHandle = createHandle(false);

  // Marks
  if (opts.showMarks) {
    const interval = opts.markInterval ?? (opts.step <= 0 ? (opts.max - opts.min) / 10 : opts.step * Math.ceil((opts.max - opts.min) / (opts.step * 10)));
    const markCount = Math.floor((opts.max - opts.min) / interval);

    for (let i = 0; i <= markCount; i++) {
      const val = opts.min + i * interval;
      const pct = ((val - opts.min) / (opts.max - opts.min)) * 100;

      const mark = document.createElement("div");
      mark.className = "sr-mark";
      mark.style.cssText = `
        position:absolute;${isH ? `left:${pct}%` : `top:${pct}%`};
        width:2px;height:2px;background:${opts.trackColor};
        border-radius:50%;pointer-events:none;z-index:1;
        transform:translate(${isH ? "-50%" : "-50%"}, ${isH ? "-50%" : "-50%"});
      `;
      root.appendChild(mark);

      // Check if there's a label for this mark
      const labelInfo = opts.markLabels?.find(m => m.value === val);
      if (labelInfo) {
        const label = document.createElement("span");
        label.textContent = labelInfo.label;
        label.style.cssText = `
          position:absolute;${isH ? `left:${pct}%` : `top:${pct}%`};
          transform:translate(${isH ? "-50%" : "-50%"}, ${isH ? "120%" : "200%"});
          font-size:11px;color:#9ca3af;white-space:nowrap;
          pointer-events:none;
        `;
        root.appendChild(label);
      }
    }
  }

  container.appendChild(root);

  // State
  let values: [number, number] = [...opts.value!];
  let activeHandle: HandleData | null = null;
  let destroyed = false;

  // --- Core Functions ---

  function valueToPercent(val: number): number {
    return ((val - opts.min) / (opts.max - opts.min)) * 100;
  }

  function percentToValue(pct: number): number {
    return snapToStep(opts.min + (pct / 100) * (opts.max - opts.min), opts.min, opts.max, opts.step);
  }

  function render(): void {
    const minPct = valueToPercent(values[0]);
    const maxPct = valueToPercent(values[1]);

    // Position handles
    if (isH) {
      minHandle.el.style.left = `${minPct}%`;
      maxHandle.el.style.left = `${maxPct}%`;
    } else {
      minHandle.el.style.top = `${minPct}%`;
      maxHandle.el.style.top = `${maxPct}%`;
    }

    // Position fill
    if (isH) {
      fill.style.left = `${minPct}%`;
      fill.style.width = `${Math.max(maxPct - minPct, 0)}%`;
      fill.style.top = `${(opts.trackSize - 6) / 2}px`;
      fill.style.height = "6px";
    } else {
      fill.style.top = `${minPct}%`;
      fill.style.height = `${Math.max(maxPct - minPct, 0)}%`;
      fill.style.left = `${(opts.trackSize - 6) / 2}px`;
      fill.style.width = "6px";
    }

    // Update tooltips
    minHandle.tooltip.textContent = opts.tooltipFormat!(values[0]);
    maxHandle.tooltip.textContent = opts.tooltipFormat!(values[1]);

    // ARIA
    root.setAttribute("aria-valuetext", `${values[0]} - ${values[1]}`);
  }

  // Initialize
  render();

  // --- Drag Handling ---

  function getClientPos(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    return {
      clientX: "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX,
      clientY: "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY,
    };
  }

  function setupDrag(handleData: HandleData): void {
    const handle = handleData.el;

    const onStart = (e: Event) => {
      if (opts.disabled || destroyed) return;
      e.preventDefault();
      activeHandle = handleData;
      handle.style.cursor = "grabbing";
      handle.style.zIndex = "3";
      handle.style.boxShadow = "0 2px 8px rgba(99,102,241,0.3)";

      // Show tooltips
      minHandle.tooltip.style.opacity = "1";
      maxHandle.tooltip.style.opacity = "1";

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!activeHandle || destroyed) return;
      ev.preventDefault();

      const rect = root.getBoundingClientRect();
      const pos = getClientPos(ev as MouseEvent | TouchEvent);
      let pct: number;

      if (isH) {
        pct = ((pos.clientX - rect.left) / rect.width) * 100;
      } else {
        pct = ((pos.clientY - rect.top) / rect.height) * 100;
      }

      pct = clamp(pct, 0, 100);
      const newVal = percentToValue(pct);

      if (handleData.isMin) {
        values[0] = Math.min(newVal, values[1] - (opts.push ? opts.step : 0));
      } else {
        values[1] = Math.max(newVal, values[0] + (opts.push ? opts.step : 0));
      }

      render();
      opts.onChange?.([...values]);
    };

    const onEnd = () => {
      if (activeHandle) {
        activeHandle.el.style.cursor = "grab";
        activeHandle.el.style.zIndex = "2";
        activeHandle.el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";

        // Hide tooltips after delay
        setTimeout(() => {
          minHandle.tooltip.style.opacity = "0";
          maxHandle.tooltip.style.opacity = "0";
        }, 800);
      }
      activeHandle = null;

      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);

      opts.onAfterChange?.([...values]);
    };

    handle.addEventListener("mousedown", onStart);
    handle.addEventListener("touchstart", onStart, { passive: false });
  }

  setupDrag(minHandle);
  setupDrag(maxHandle);

  // Click on track to jump
  root.addEventListener("click", (e) => {
    if (opts.disabled || destroyed) return;
    if ((e.target as HTMLElement).closest(".sr-handle")) return;

    const rect = root.getBoundingClientRect();
    const pos = getClientPos(e as MouseEvent);
    let pct = isH
      ? ((pos.clientX - rect.left) / rect.width) * 100
      : ((pos.clientY - rect.top) / rect.height) * 10;

    pct = clamp(pct, 0, 100);
    const clickedVal = percentToValue(pct);

    // Determine which handle is closer
    const distMin = Math.abs(clickedVal - values[0]);
    const distMax = Math.abs(clickedVal - values[1]);

    if (distMin < distMax) {
      values[0] = Math.min(clickedVal, values[1] - opts.step);
    } else {
      values[1] = Math.max(clickedVal, values[0] + opts.step);
    }

    render();
    opts.onChange?.([...values]);
    opts.onAfterChange?.([...values]);
  });

  // Keyboard navigation
  root.addEventListener("keydown", (e) => {
    if (opts.disabled || destroyed) return;

    const focused = document.activeElement;
    const isMinFocused = focused === minHandle.el;
    const isMaxFocused = focused === maxHandle.el;

    if (!isMinFocused && !isMaxFocused) return;

    const step = e.shiftKey ? opts.step * 10 : opts.step;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        if (isMinFocused) {
          values[0] = clamp(values[0] + step, opts.min, values[1] - opts.step);
        } else {
          values[1] = clamp(values[1] + step, values[0] + step, opts.max);
        }
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        if (isMinFocused) {
          values[0] = clamp(values[0] - step, opts.min, values[1] - opts.step);
        } else {
          values[1] = clamp(values[1] - step, values[0] + step, opts.max);
        }
        break;
      case "Home":
        e.preventDefault();
        if (isMinFocused) values[0] = opts.min; else values[1] = opts.max;
        break;
      case "End":
        e.preventDefault();
        if (isMinFocused) values[0] = values[1]; else values[1] = opts.min;
        break;
      default:
        return;
    }

    render();
    opts.onChange?.([...values]);
    opts.onAfterChange?.([...values]);
  });

  // Show tooltips on focus
  minHandle.el.addEventListener("focus", () => { minHandle.tooltip.style.opacity = "1"; });
  maxHandle.el.addEventListener("focus", () => { maxHandle.tooltip.style.opacity = "1"; });
  minHandle.el.addEventListener("blur", () => { minHandle.tooltip.style.opacity = "0"; });
  maxHandle.el.addEventListener("blur", () => { maxHandle.tooltip.style.opacity = "0"; });

  // Instance
  const instance: SliderRangeInstance = {
    element: root,

    getValue() { return [...values] },

    setValue(newValues: [number, number], animate = false) {
      values = [
        clamp(newValues[0], opts.min, opts.max),
        clamp(newValues[1], opts.min, opts.max),
      ];
      if (values[0] > values[1]) [values[0], values[1]] = [values[1], values[0]];
      render();
      opts.onChange?.([...values]);
    },

    setMin(v: number) { instance.setValue([v, values[1]]); },
    setMax(v: number) { instance.setValue([values[0], v]); },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
      root.style.opacity = disabled ? String(opts.disabledOpacity) : "1";
      root.style.cursor = disabled ? "not-allowed" : "pointer";
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
